import { randomBytes } from 'node:crypto';
import http from 'node:http';
import nodeHttps from 'node:https';
import { Injectable } from '@nestjs/common';
import { ne } from 'drizzle-orm';
import { Logger } from '@postybirb/logger';
import { AccountRepository } from '@postybirb/database';
import { NULL_ACCOUNT_ID, ProxyConfiguration } from '@postybirb/types';
import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import {
  IsTestEnvironment,
  getPartitionKey,
  StartupOptionsManager,
} from '@postybirb/utils/common';
import { PlatformService } from '@postybirb/platform';
import { buildProxyRules } from '@postybirb/proxy';
import { UpdateProxyConfigurationDto } from './dtos/proxy-configuration.dto';
import { ProxyPoolEntryDto } from './dtos/proxy-pool-entry.dto';

export type ProxyConnectionTestResult = {
  success: boolean;
  message: string;
};

@Injectable()
export class ProxyService {
  private readonly logger = Logger('ProxyService');

  private applyInFlight: Promise<void> | null = null;
  private applyQueued = false;

  private createProxyAgent(
    entry: ProxyPoolEntryDto,
    secure: boolean,
  ): SocksProxyAgent | HttpProxyAgent<string> | HttpsProxyAgent<string> {
    const agentUrl = buildProxyRules(entry);
    if (!agentUrl) {
      throw new Error('Proxy host and port are required');
    }

    if (entry.type === 'socks5') {
      return new SocksProxyAgent(agentUrl);
    }

    return secure ? new HttpsProxyAgent(agentUrl) : new HttpProxyAgent(agentUrl);
  }

  private async requestThroughProxy(
    url: URL,
    agent: SocksProxyAgent | HttpProxyAgent<string> | HttpsProxyAgent<string>,
    timeoutMs: number,
  ): Promise<number> {
    const secure = url.protocol === 'https:';
    const lib = secure ? nodeHttps : http;

    return new Promise<number>((resolve, reject) => {
      let timeout: NodeJS.Timeout | undefined;

      const req = lib.request(
        url,
        {
          method: 'HEAD',
          agent,
        },
        (response) => {
          if (timeout) {
            clearTimeout(timeout);
          }
          response.resume();
          resolve(response.statusCode ?? 0);
        },
      );

      timeout = setTimeout(() => {
        req.destroy(new Error('Probe timed out'));
      }, timeoutMs);

      req.on('error', (error) => {
        if (timeout) {
          clearTimeout(timeout);
        }
        reject(error);
      });

      req.end();
    });
  }

  constructor(
    private readonly platform: PlatformService,
    private readonly accountRepository: AccountRepository,
  ) {}

  private async getPartitionIds(): Promise<string[]> {
    const accounts = await this.accountRepository.find({
      where: ne(this.accountRepository.table.id, NULL_ACCOUNT_ID),
    });

    const partitions = new Set<string>();
    for (const account of accounts) {
      partitions.add(getPartitionKey(account.id));
      if (account.website === 'instagram') {
        partitions.add(getPartitionKey(`instagram-oauth-${account.id}`));
      }
    }

    return [...partitions];
  }

  /** Called after Nest bootstrap finishes listening. */
  bootstrapApply(): Promise<void> {
    return this.scheduleApply();
  }

  /**
   * Coalesces concurrent apply requests (startup, save, new account, etc.).
   */
  scheduleApply(): Promise<void> {
    if (IsTestEnvironment()) {
      return Promise.resolve();
    }

    if (this.applyInFlight) {
      this.applyQueued = true;
      this.logger.debug('Proxy apply already running, queueing follow-up');
      return this.applyInFlight;
    }

    this.applyInFlight = (async () => {
      do {
        this.applyQueued = false;
        this.logger.debug('Running proxy apply cycle');
        await this.apply();
      } while (this.applyQueued);
    })().finally(() => {
      this.applyInFlight = null;
      this.logger.debug('Proxy apply queue drained');
    });

    return this.applyInFlight;
  }

  /** Applies persisted proxy settings to all Electron sessions. */
  async apply(): Promise<void> {
    if (IsTestEnvironment()) {
      return;
    }

    const partitionIds = await this.getPartitionIds();
    await this.platform.proxy.applyProxy(partitionIds, undefined);
  }

  /** Re-applies proxy after a new account partition is created. */
  async onAccountCreated(): Promise<void> {
    await this.scheduleApply();
  }

  /**
   * Merges secrets, persists proxy settings, and applies them globally.
   */
  async saveConfiguration(
    incoming: UpdateProxyConfigurationDto,
  ): Promise<void> {
    const current = StartupOptionsManager.get().proxy;
    const proxyPatch: ProxyConfiguration = {
      ...current,
      ...incoming,
      pool: incoming.pool.map((entry) => {
        const existing = current.pool.find((saved) => saved.id === entry.id);
        return {
          ...entry,
          password: entry.password?.trim()
            ? entry.password
            : (existing?.password ?? ''),
        };
      }),
      pacAccessToken:
        incoming.mode === 'pac_routing'
          ? incoming.pacAccessToken?.trim() || current.pacAccessToken
          : undefined,
    };

    if (
      proxyPatch.mode === 'pac_routing' &&
      !proxyPatch.pacAccessToken?.trim()
    ) {
      const nextProxyPatch = {
        ...proxyPatch,
        pacAccessToken: randomBytes(24).toString('hex'),
      };
      this.logger
        .withMetadata({ mode: nextProxyPatch.mode })
        .info('Generated pacAccessToken for PAC routing mode');
      StartupOptionsManager.set({ proxy: nextProxyPatch });
      await this.scheduleApply();
      return;
    }

    StartupOptionsManager.set({ proxy: proxyPatch });
    await this.scheduleApply();
  }

  /**
   * Probes a pool entry via the Node agent without changing persisted proxy settings.
   */
  async testPoolEntryConnection(
    poolEntryDto: ProxyPoolEntryDto,
  ): Promise<ProxyConnectionTestResult> {
    const saved = StartupOptionsManager.get().proxy;
    const existing = saved.pool.find((entry) => entry.id === poolEntryDto.id);
    const entry = {
      ...poolEntryDto,
      password: poolEntryDto.password?.trim()
        ? poolEntryDto.password
        : (existing?.password ?? ''),
    };

    if (!entry.host) {
      return {
        success: false,
        message: 'Proxy host is required',
      };
    }

    const proxyPort = parseInt(entry.port, 10);
    if (Number.isNaN(proxyPort) || proxyPort < 1 || proxyPort > 65535) {
      return {
        success: false,
        message: 'Invalid proxy port',
      };
    }

    const testUrl = 'https://www.google.com/generate_204';

    try {
      const parsedUrl = new URL(testUrl);
      const agent = this.createProxyAgent(
        entry,
        parsedUrl.protocol === 'https:',
      );
      const statusCode = await this.requestThroughProxy(parsedUrl, agent, 15_000);

      if (statusCode === 407) {
        return {
          success: false,
          message: 'Proxy authentication failed. Check username and password.',
        };
      }

      if (statusCode >= 200 && statusCode < 400) {
        return {
          success: true,
          message: 'Proxy connection test succeeded',
        };
      }

      return {
        success: false,
        message: `Unexpected response status: ${statusCode}`,
      };
    } catch (error) {
      this.logger.withError(error).warn('Proxy connection test failed');
      const message = error instanceof Error ? error.message : String(error);

      if (entry.type === 'socks5') {
        return {
          success: false,
          message:
            'SOCKS5 connection failed. Check host and port. If your provider gives an HTTP proxy URL, switch the type to HTTP(S).',
        };
      }

      if (/SOCKS/i.test(message)) {
        return {
          success: false,
          message:
            'Connection failed over SOCKS. Try HTTP(S) as the proxy type if your provider uses an HTTP proxy endpoint.',
        };
      }

      return {
        success: false,
        message: 'Could not reach the test URL through the configured proxy',
      };
    }
  }
}
