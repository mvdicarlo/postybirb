import { Injectable } from '@nestjs/common';
import { Account, AccountRepository } from '@postybirb/database';
import { Logger } from '@postybirb/logger';
import type {
  ProxyConfiguration,
  ProxyPoolEntry,
  WebsiteProxyChoice,
} from '@postybirb/types';
import {
  extractHostname,
  normalizeDomain,
  PostyBirbEnvConfig,
  StartupOptionsManager,
  resolveCloudApiUrl,
} from '@postybirb/utils/common';
import {
  buildPacProxyDirective,
  resolvePacHttpPort,
} from '@postybirb/proxy';
import { WebsiteDomainService } from './website-domain.service';

@Injectable()
export class PacScriptService {
  private readonly logger = Logger('PacScript');

  constructor(
    private readonly websiteDomainService: WebsiteDomainService,
    private readonly accountRepository: AccountRepository,
  ) {}

  async generate(config: ProxyConfiguration): Promise<string> {
    const accounts = await this.accountRepository.find({});
    const accountsByWebsite = this.groupAccountsByWebsite(accounts);
    const poolById = new Map(config.pool.map((entry) => [entry.id, entry]));

    const lines: string[] = [
      'function FindProxyForURL(url, host) {',
      ...this.buildBypassRules(),
    ];

    let ruleCount = 0;
    let websitesWithAccounts = 0;

    for (const [websiteId, choice] of Object.entries(config.routing)) {
      const websiteAccounts = accountsByWebsite.get(websiteId) ?? [];
      if (websiteAccounts.length === 0) {
        continue;
      }

      websitesWithAccounts += 1;

      if (choice === 'system') {
        continue;
      }

      const domains = await this.websiteDomainService.getDomainsForRouting(
        websiteId,
        websiteAccounts,
      );

      for (const domain of domains) {
        const pacReturn = this.resolvePacReturn(choice, poolById);
        if (!pacReturn) {
          continue;
        }

        lines.push(...this.buildDomainRule(domain, pacReturn));
        ruleCount += 1;
      }
    }

    lines.push('  return "DIRECT";');
    lines.push('}');

    const script = lines.join('\n');

    this.logger
      .withMetadata({
        mode: config.mode,
        ruleCount,
        websitesWithAccounts,
      })
      .info('generate');

    if ((process.env.LOG_LEVEL ?? 'debug').toLowerCase() === 'debug') {
      this.logger
        .withMetadata({ preview: script.split('\n').slice(0, 20).join('\n') })
        .debug('preview');
    }

    return script;
  }

  async generateForToken(token: string): Promise<string | null> {
    const normalizedToken = token.trim();
    if (!normalizedToken) {
      return null;
    }

    const { proxy } = StartupOptionsManager.get();
    const expectedToken = proxy.pacAccessToken?.trim();

    if (
      proxy.mode !== 'pac_routing' ||
      !expectedToken ||
      normalizedToken !== expectedToken
    ) {
      return null;
    }

    return this.generate(proxy);
  }

  private groupAccountsByWebsite(accounts: Account[]): Map<string, Account[]> {
    const grouped = new Map<string, Account[]>();

    for (const account of accounts) {
      const existing = grouped.get(account.website) ?? [];
      existing.push(account);
      grouped.set(account.website, existing);
    }

    return grouped;
  }

  private buildBypassRules(): string[] {
    const hosts = new Set<string>(['127.0.0.1', 'localhost', '::1']);
    const cloudHost = extractHostname(resolveCloudApiUrl());
    if (cloudHost) {
      hosts.add(normalizeDomain(cloudHost));
    }

    const appPort = PostyBirbEnvConfig.port;
    const rules = [
      '  if (isPlainHostName(host) || host == "localhost") return "DIRECT";',
      '  if (host == "127.0.0.1" || host == "::1") return "DIRECT";',
    ];

    for (const host of hosts) {
      if (host === '127.0.0.1' || host === 'localhost' || host === '::1') {
        continue;
      }

      rules.push(
        `  if (host == "${this.escapePacString(host)}" || dnsDomainIs(host, ".${this.escapePacString(host)}")) return "DIRECT";`,
      );
    }

    if (appPort) {
      rules.push(
        `  if ((host == "127.0.0.1" || host == "localhost") && url.indexOf(":${this.escapePacString(appPort)}/") > -1) return "DIRECT";`,
      );
      const pacPort = resolvePacHttpPort(appPort);
      rules.push(
        `  if ((host == "127.0.0.1" || host == "localhost") && url.indexOf(":${this.escapePacString(pacPort)}/") > -1) return "DIRECT";`,
      );
    }

    return rules;
  }

  private resolvePacReturn(
    choice: WebsiteProxyChoice,
    poolById: Map<string, ProxyPoolEntry>,
  ): string | null {
    if (choice === 'direct') {
      return 'DIRECT';
    }

    if (choice === 'system') {
      return null;
    }

    const entry = poolById.get(choice);
    if (!entry) {
      return null;
    }

    const pacReturn = buildPacProxyDirective(entry);
    return pacReturn === 'DIRECT' ? null : pacReturn;
  }

  private buildDomainRule(domain: string, pacReturn: string): string[] {
    const escaped = this.escapePacString(normalizeDomain(domain));
    return [
      `  if (host == "${escaped}" || dnsDomainIs(host, ".${escaped}")) return "${pacReturn}";`,
    ];
  }

  private escapePacString(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }
}
