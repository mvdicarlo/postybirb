import { session, Session, type ProxyConfig } from 'electron';
import { Logger } from '@postybirb/logger';
import {
  buildSessionProxyRules,
  LegacyProxyConfiguration,
  ProxyProfile,
  resolveProfileForWebsite,
} from '@postybirb/utils/common';
import {
  applyGlobalProxyConfig,
  attachProxyAuthToRequest,
  clearProxyAuthStore,
  getProxyConfiguration,
  onProxyConfigurationApplied,
  onSessionCreated,
  probePoolEntryConnection,
  probeProfileConnection,
  refreshAllPartitionSessions,
  resolveProxyForUrl,
  resetGlobalProxyStateForTests,
  setPartitionIdProvider,
  syncLegacyPartitionProfile,
  getManagedPartitionEntries,
} from './global-proxy-manager';
import {
  collectManagedPartitionIds,
  resolveWebsiteFromPartition,
  type PartitionEntry,
} from './proxy-partitions';
import {
  BrowserSessionRoute,
  collectWebsiteIdsWithEnabledProfiles,
  createPartitionWebsiteResolver,
  ProxyRequestContext,
  ProxyRoute,
  resolveBrowserSessionRoute,
  resolveHttpRoute,
  resolveProfileForPartition,
} from './proxy-route';

export type { PartitionEntry } from './proxy-partitions';
export type { ProxyRequestContext, ProxyRoute } from './proxy-route';

export {
  applyGlobalProxyConfig,
  attachProxyAuthToRequest,
  getProxyConfiguration,
  onProxyConfigurationApplied,
  onSessionCreated,
  probePoolEntryConnection,
  probeProfileConnection,
  refreshAllPartitionSessions,
  resolveProxyForUrl,
  resetGlobalProxyStateForTests,
  setPartitionIdProvider,
  getManagedPartitionEntries,
};

const logger = Logger('ProxyManager');

let activeProxyConfiguration: LegacyProxyConfiguration = { profiles: [] };
const appliedPartitionProxies = new Map<string, string>();

function buildPartitionProxyFingerprint(profile: ProxyProfile | null): string {
  if (!profile?.enabled) {
    return 'system';
  }

  return [
    profile.id,
    profile.type,
    profile.host,
    profile.port,
    profile.username,
    profile.password,
  ].join('\0');
}

export function clearPartitionProxyCache(): void {
  appliedPartitionProxies.clear();
}

export function resolveActiveProfileForWebsite(
  websiteId: string,
): ProxyProfile | null {
  return resolveProfileForWebsite(websiteId, activeProxyConfiguration);
}

function getSystemProxyConfig(): ProxyConfig {
  return { mode: 'system' };
}

function getFixedProxyConfig(profile: ProxyProfile): ProxyConfig {
  const proxyRules = buildSessionProxyRules(profile);
  if (!proxyRules) {
    return getSystemProxyConfig();
  }

  return {
    mode: 'fixed_servers',
    proxyRules,
    proxyBypassRules: '<-loopback>',
  };
}

/** @deprecated Use resolveWebsiteFromPartition via proxy-partitions */
export function resolveWebsiteForPartition(
  partitionId: string,
  entries: PartitionEntry[],
) {
  return resolveWebsiteFromPartition(partitionId, entries);
}

async function getAccountPartitionEntries(): Promise<PartitionEntry[]> {
  return getManagedPartitionEntries();
}

async function createActivePartitionWebsiteResolver() {
  const entries = await getAccountPartitionEntries();
  return createPartitionWebsiteResolver(entries);
}

export async function resolveHttpRequestRoute(
  context: ProxyRequestContext,
): Promise<ProxyRoute> {
  const resolvePartitionWebsite = await createActivePartitionWebsiteResolver();
  return resolveHttpRoute(
    context,
    resolvePartitionWebsite,
    activeProxyConfiguration,
  );
}

export async function resolveBrowserProxySession(
  context: ProxyRequestContext,
): Promise<BrowserSessionRoute> {
  const resolvePartitionWebsite = await createActivePartitionWebsiteResolver();
  return resolveBrowserSessionRoute(
    context,
    resolvePartitionWebsite,
    activeProxyConfiguration,
  );
}

async function applyProfileToSession(
  targetSession: Session,
  profile: ProxyProfile | null,
  partitionId?: string,
): Promise<void> {
  const config =
    profile && profile.enabled
      ? getFixedProxyConfig(profile)
      : getSystemProxyConfig();

  await targetSession.setProxy(config);

  if (partitionId) {
    syncLegacyPartitionProfile(partitionId, profile);
  }

  targetSession.closeAllConnections();
}

export function getActiveProxyConfiguration(): LegacyProxyConfiguration {
  return {
    profiles: activeProxyConfiguration.profiles.map((profile) => ({
      ...profile,
      websites: [...profile.websites],
    })),
  };
}

export async function ensurePartitionProxy(
  partitionId: string,
  profile?: ProxyProfile,
  force = false,
): Promise<void> {
  if (profile) {
    await ensureLegacyPartitionProxy(partitionId, profile, force);
    return;
  }

  await applyGlobalProxyConfig();
}

async function ensureLegacyPartitionProxy(
  partitionId: string,
  profile?: ProxyProfile,
  force = false,
): Promise<void> {
  if (!partitionId?.trim()) {
    return;
  }

  let resolvedProfile = profile ?? null;
  if (!resolvedProfile) {
    const entries = await getAccountPartitionEntries();
    const resolvePartitionWebsite = createPartitionWebsiteResolver(entries);
    resolvedProfile = resolveProfileForPartition(
      partitionId,
      resolvePartitionWebsite,
      activeProxyConfiguration,
    );
  }

  const fingerprint = buildPartitionProxyFingerprint(resolvedProfile);
  if (!force && appliedPartitionProxies.get(partitionId) === fingerprint) {
    return;
  }

  logger
    .withMetadata({
      partitionId,
      profileId: resolvedProfile?.id ?? null,
      enabled: resolvedProfile?.enabled ?? false,
    })
    .info('applyPartition');

  const partition = session.fromPartition(`persist:${partitionId}`);
  await applyProfileToSession(partition, resolvedProfile, partitionId);
  appliedPartitionProxies.set(partitionId, fingerprint);
}

export async function applyProxySettings(
  configuration?: LegacyProxyConfiguration,
): Promise<void> {
  if (configuration === undefined) {
    await applyGlobalProxyConfig();
    return;
  }

  activeProxyConfiguration = {
    profiles: configuration.profiles.map((profile) => ({
      ...profile,
      websites: [...profile.websites],
    })),
  };

  clearPartitionProxyCache();
  clearProxyAuthStore();

  const { app } = await import('electron');
  if (!app.isReady()) {
    return;
  }

  await applyProfileToSession(session.defaultSession, null);

  const entries = await getAccountPartitionEntries();
  const websiteIds = collectWebsiteIdsWithEnabledProfiles(
    activeProxyConfiguration,
  );
  const partitionIds = collectManagedPartitionIds(entries, websiteIds);

  await Promise.all(
    partitionIds.map((partitionId) =>
      ensurePartitionProxy(partitionId, undefined, true),
    ),
  );
}
