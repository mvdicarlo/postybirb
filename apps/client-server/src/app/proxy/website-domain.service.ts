import { Injectable } from '@nestjs/common';
import { Account, WebsiteDataRepository } from '@postybirb/database';
import { Logger } from '@postybirb/logger';
import {
  extractHostname,
  mergeDomainLists,
  normalizeDomain,
} from '@postybirb/utils/common';

export type StaticWebsiteDomainProvider = (websiteId: string) => string[];

@Injectable()
export class WebsiteDomainService {
  private readonly logger = Logger('WebsiteDomainService');

  private readonly websiteDomainMap = new Map<string, string[]>();

  private readonly websiteDataRepository = new WebsiteDataRepository();

  private staticDomainProvider: StaticWebsiteDomainProvider | null = null;

  setStaticDomainProvider(provider: StaticWebsiteDomainProvider): void {
    this.staticDomainProvider = provider;
  }

  registerStaticDomains(websiteId: string, domains: string[]): void {
    const normalized = mergeDomainLists(domains);
    this.websiteDomainMap.set(websiteId, normalized);

    this.logger
      .withMetadata({ websiteId, staticDomainCount: normalized.length })
      .info('registerStatic');

    if (normalized.length === 0) {
      this.logger
        .withMetadata({ websiteId })
        .warn('static domain list is empty');
    }
  }

  getStaticDomains(websiteId: string): string[] {
    return [...(this.websiteDomainMap.get(websiteId) ?? [])];
  }

  async getDomainsForRouting(
    websiteId: string,
    accounts: Account[],
  ): Promise<string[]> {
    if (accounts.length === 0) {
      return [];
    }

    const staticDomains = this.ensureStaticDomains(websiteId);
    const runtimeDomains = await this.collectRuntimeDomains(websiteId, accounts);
    const total = mergeDomainLists(staticDomains, runtimeDomains);

    this.logger
      .withMetadata({
        websiteId,
        accountCount: accounts.length,
        totalDomains: total.length,
      })
      .debug('forRouting');

    if (total.length === 0) {
      this.logger
        .withMetadata({ websiteId })
        .warn('no domains for routing');
    }

    return total;
  }

  private ensureStaticDomains(websiteId: string): string[] {
    if (this.websiteDomainMap.has(websiteId)) {
      return this.getStaticDomains(websiteId);
    }

    const domains = this.staticDomainProvider?.(websiteId) ?? [];
    this.registerStaticDomains(websiteId, domains);
    return this.getStaticDomains(websiteId);
  }

  private async collectRuntimeDomains(
    websiteId: string,
    accounts: Account[],
  ): Promise<string[]> {
    const domains: string[][] = [];

    await Promise.all(
      accounts.map(async (account) => {
        const data = await this.websiteDataRepository.findById(account.id);
        if (!data?.data) {
          return;
        }

        domains.push(this.extractRuntimeDomainsFromData(data.data));
      }),
    );

    return mergeDomainLists(...domains);
  }

  private extractRuntimeDomainsFromData(data: unknown): string[] {
    if (!data || typeof data !== 'object') {
      return [];
    }

    const record = data as Record<string, unknown>;
    const hosts: string[] = [];

    const { instanceUrl } = record;
    if (typeof instanceUrl === 'string' && instanceUrl.trim()) {
      const host =
        extractHostname(
          instanceUrl.includes('://')
            ? instanceUrl
            : `https://${instanceUrl}`,
        ) ?? normalizeDomain(instanceUrl);
      if (host) {
        hosts.push(host);
      }
    }

    for (const key of ['fileUrl', 'notificationUrl', 'serviceUrl'] as const) {
      const value = record[key];
      if (typeof value === 'string' && value.trim()) {
        const host = extractHostname(value);
        if (host) {
          hosts.push(host);
        }
      }
    }

    return mergeDomainLists(hosts);
  }
}
