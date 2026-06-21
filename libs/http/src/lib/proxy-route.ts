import { WebsiteId } from '@postybirb/types';
import {
  buildProxyAgentUrl,
  LegacyProxyConfiguration,
  ProxyProfile,
  resolveProfileForWebsite,
} from '@postybirb/utils/common';
import {
  getHeadlessWebsitePartitionId,
  resolveWebsiteFromPartition,
  type PartitionEntry,
} from './proxy-partitions';

export type ProxyTransport = 'chromium-session' | 'node-agent' | 'system';

export type ProxyRequestContext = {
  partition?: string;
  websiteId?: string;
};

export type ProxyRoute =
  | {
      transport: 'chromium-session';
      partitionId: string;
      profile: ProxyProfile | null;
    }
  | { transport: 'node-agent'; profile: ProxyProfile }
  | { transport: 'system' };

export type BrowserSessionRoute = {
  partitionId: string | undefined;
  profile: ProxyProfile | null;
};

export type PartitionWebsiteResolver = (
  partitionId: string,
) => WebsiteId | null;

export function createPartitionWebsiteResolver(
  accountEntries: PartitionEntry[],
): PartitionWebsiteResolver {
  return (partitionId) => resolveWebsiteFromPartition(partitionId, accountEntries);
}

export function resolveProfileForPartition(
  partitionId: string,
  resolvePartitionWebsite: PartitionWebsiteResolver,
  configuration: LegacyProxyConfiguration,
): ProxyProfile | null {
  const websiteId = resolvePartitionWebsite(partitionId);
  if (!websiteId) {
    return null;
  }

  return resolveProfileForWebsite(websiteId, configuration);
}

export function supportsNodeAgentProfile(
  profile: ProxyProfile | null,
): profile is ProxyProfile {
  return Boolean(profile?.enabled && buildProxyAgentUrl(profile));
}

/**
 * Routes stateless Http / fetch traffic.
 * Partition-bound requests use Chromium net.request; partition-less website
 * traffic uses Node proxy agents when a profile is assigned.
 */
export function resolveHttpRoute(
  context: ProxyRequestContext,
  resolvePartitionWebsite: PartitionWebsiteResolver,
  configuration: LegacyProxyConfiguration,
): ProxyRoute {
  const partitionId = context.partition?.trim();
  if (partitionId) {
    return {
      transport: 'chromium-session',
      partitionId,
      profile: resolveProfileForPartition(
        partitionId,
        resolvePartitionWebsite,
        configuration,
      ),
    };
  }

  const websiteId = context.websiteId?.trim();
  if (websiteId) {
    const profile = resolveProfileForWebsite(websiteId, configuration);
    if (supportsNodeAgentProfile(profile)) {
      return { transport: 'node-agent', profile };
    }
  }

  return { transport: 'system' };
}

/**
 * Routes BrowserWindow / webview traffic — always Chromium sessions.
 * Creates a headless website partition when only websiteId is provided.
 */
export function resolveBrowserSessionRoute(
  context: ProxyRequestContext,
  resolvePartitionWebsite: PartitionWebsiteResolver,
  configuration: LegacyProxyConfiguration,
): BrowserSessionRoute {
  const partitionId = context.partition?.trim();
  if (partitionId) {
    return {
      partitionId,
      profile: resolveProfileForPartition(
        partitionId,
        resolvePartitionWebsite,
        configuration,
      ),
    };
  }

  const websiteId = context.websiteId?.trim();
  if (websiteId) {
    const profile = resolveProfileForWebsite(websiteId, configuration);
    if (supportsNodeAgentProfile(profile)) {
      return {
        partitionId: getHeadlessWebsitePartitionId(websiteId),
        profile,
      };
    }
  }

  return { partitionId: undefined, profile: null };
}

export function collectWebsiteIdsWithEnabledProfiles(
  configuration: LegacyProxyConfiguration,
): string[] {
  const websiteIds = new Set<string>();

  for (const profile of configuration.profiles) {
    if (!profile.enabled) {
      continue;
    }

    for (const websiteId of profile.websites) {
      websiteIds.add(websiteId);
    }
  }

  return [...websiteIds];
}
