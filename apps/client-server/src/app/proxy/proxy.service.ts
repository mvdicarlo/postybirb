import { randomBytes } from 'node:crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
import { AccountRepository, AccountSchema } from '@postybirb/database';
import { applyProxy } from '@postybirb/http';
import { Logger } from '@postybirb/logger';
import {
  isProxyConfiguration,
  mergeProxyPoolPasswords,
  normalizeProxyPoolEntry,
  prepareProxyConfiguration,
  ProxyConfiguration,
  validateProxyConfiguration,
  NULL_ACCOUNT_ID,
} from '@postybirb/types';
import {
  toEnabledProxyProfile,
  buildProxyRules,
  IsTestEnvironment,
  StartupOptionsManager,
  collectManagedPartitionIds,
} from '@postybirb/utils/common';
import { ne } from 'drizzle-orm';
import { UpdateProxyConfigurationDto } from './dtos/proxy-configuration.dto';
import { TestProxyPoolEntryDto } from './dtos/proxy-pool-entry.dto';
import { probeProxyPoolEntry } from './proxy-pool-probe';

export type ProxyConnectionTestResult = {
  success: boolean;
  message: string;
};

@Injectable()
export class ProxyService {
  private readonly logger = Logger('ProxyService');

  private applyInFlight: Promise<void> | null = null;

  constructor(private readonly accountRepository: AccountRepository) {}

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
      return this.applyInFlight;
    }

    this.applyInFlight = this.apply().finally(() => {
      this.applyInFlight = null;
    });

    return this.applyInFlight;
  }

  /** Applies persisted proxy settings to all Electron sessions. */
  async apply(): Promise<void> {
    if (IsTestEnvironment()) {
      return;
    }

    await applyProxy(undefined, await this.loadPartitionIds());
  }

  /** Re-applies proxy after a new account partition is created. */
  async onAccountCreated(): Promise<void> {
    await this.scheduleApply();
  }

  /**
   * Validates, merges secrets, persists proxy settings, and applies them globally.
   */
  async saveConfiguration(incoming: UpdateProxyConfigurationDto): Promise<void> {
    if (!isProxyConfiguration(incoming)) {
      throw new BadRequestException('Unsupported proxy configuration shape');
    }

    const current = StartupOptionsManager.get().proxy;
    let proxyPatch = this.buildProxyPatch(current, incoming);

    if (
      proxyPatch.mode === 'pac_routing' &&
      !proxyPatch.pacAccessToken?.trim()
    ) {
      proxyPatch = {
        ...proxyPatch,
        pacAccessToken: randomBytes(24).toString('hex'),
      };
      this.logger
        .withMetadata({ mode: proxyPatch.mode })
        .info('Generated pacAccessToken for PAC routing mode');
    }

    const prepared = prepareProxyConfiguration({
      ...current,
      ...proxyPatch,
    });

    const validation = validateProxyConfiguration(prepared);
    if (!validation.ok) {
      this.logger
        .withMetadata({ errors: validation.errors })
        .warn('Proxy configuration validation failed');
      throw new BadRequestException(validation.errors.join(' '));
    }

    StartupOptionsManager.set({ proxy: proxyPatch });
    await this.scheduleApply();
  }

  /**
   * Probes a pool entry via the Node agent without changing persisted proxy settings.
   */
  async testPoolEntryConnection(
    poolEntryDto: TestProxyPoolEntryDto,
  ): Promise<ProxyConnectionTestResult> {
    const saved = StartupOptionsManager.get().proxy;
    const existing = saved.pool.find((entry) => entry.id === poolEntryDto.id);
    const entry = normalizeProxyPoolEntry({
      ...poolEntryDto,
      password: poolEntryDto.password?.trim()
        ? poolEntryDto.password
        : existing?.password ?? '',
    });

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

    if (!buildProxyRules(toEnabledProxyProfile(entry))) {
      return {
        success: false,
        message: 'Proxy host and port are required',
      };
    }

    const testUrl = 'https://www.google.com/generate_204';

    try {
      const { statusCode } = await probeProxyPoolEntry(entry, testUrl, {
        method: 'HEAD',
        timeoutMs: 15_000,
      });

      if (statusCode === 407) {
        return {
          success: false,
          message:
            'Proxy authentication failed. Check username and password.',
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

  private async loadPartitionIds(): Promise<string[]> {
    const accounts = await this.accountRepository.find({
      where: ne(AccountSchema.id, NULL_ACCOUNT_ID),
    });

    return collectManagedPartitionIds(
      accounts.map((account) => ({
        partitionId: account.id,
        websiteId: account.website,
      })),
    );
  }

  private buildProxyPatch(
    current: ProxyConfiguration,
    incoming: UpdateProxyConfigurationDto,
  ): ProxyConfiguration {
    return {
      mode: incoming.mode,
      pool: mergeProxyPoolPasswords(incoming.pool, current.pool),
      fixedProxyId: incoming.fixedProxyId,
      routing: incoming.routing,
      pacAccessToken:
        incoming.mode === 'pac_routing'
          ? incoming.pacAccessToken?.trim() || current.pacAccessToken
          : undefined,
    };
  }
}
