import { WebsiteId } from '@postybirb/types';
import {
  getHeadlessWebsitePartitionId,
  resolveWebsiteFromPartition,
  type PartitionEntry,
} from './proxy-partitions';

export type ProxyTransport = 'chromium-session' | 'system';

export type ProxyRequestContext = {
  partition?: string;
  websiteId?: string;
};

export type ProxyRoute =
  | {
      transport: 'chromium-session';
      partitionId: string;
    }
  | { transport: 'system' };

export type BrowserSessionRoute = {
  partitionId: string | undefined;
};

export type PartitionWebsiteResolver = (
  partitionId: string,
) => WebsiteId | null;

export function createPartitionWebsiteResolver(
  accountEntries: PartitionEntry[],
): PartitionWebsiteResolver {
  return (partitionId) => resolveWebsiteFromPartition(partitionId, accountEntries);
}

/**
 * Routes Http / fetch traffic through Chromium sessions.
 * Partition-less requests inherit defaultSession proxy rules from applyGlobalProxyConfig.
 */
export function resolveHttpRoute(context: ProxyRequestContext): ProxyRoute {
  const partitionId = context.partition?.trim();
  if (partitionId) {
    return {
      transport: 'chromium-session',
      partitionId,
    };
  }

  return { transport: 'system' };
}

/**
 * Routes BrowserWindow / webview traffic through Chromium sessions.
 */
export function resolveBrowserSessionRoute(
  context: ProxyRequestContext,
): BrowserSessionRoute {
  const partitionId = context.partition?.trim();
  return {
    partitionId: partitionId || undefined,
  };
}

/** @deprecated Headless partitions are refreshed for websites with accounts or routing. */
export function collectWebsiteIdsWithEnabledProfiles(
  websiteIds: string[],
): string[] {
  return [...new Set(websiteIds)];
}

export { getHeadlessWebsitePartitionId };
