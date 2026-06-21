import { session, Session, type ProxyConfig } from 'electron';
import { Logger } from '@postybirb/logger';
import {
  buildChromiumProxyBypassRules,
  buildSessionProxyRules,
  LegacyProxyConfiguration,
  ProxyProfile,
} from '@postybirb/utils/common';
import {
  applyGlobalProxyConfig,
  attachProxyAuthToRequest,
  getProxyConfiguration,
  invalidateAppliedGlobalProxyFingerprint,
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
  resolveWebsiteFromPartition,
  type PartitionEntry,
} from './proxy-partitions';
import {
  BrowserSessionRoute,
  ProxyRequestContext,
  ProxyRoute,
  resolveBrowserSessionRoute,
  resolveHttpRoute,
} from './proxy-route';

export type { PartitionEntry } from './proxy-partitions';
export type { ProxyRequestContext, ProxyRoute } from './proxy-route';

export {
  applyGlobalProxyConfig,
  attachProxyAuthToRequest,
  getProxyConfiguration,
  invalidateAppliedGlobalProxyFingerprint,
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

/** @deprecated Use getProxyConfiguration(); kept for Telegram until telegram-socks-only lands */
export function getActiveProxyConfiguration(): LegacyProxyConfiguration {
  return { profiles: [] };
}

/** @deprecated Legacy v2 helper; always returns null under global proxy routing */
export function resolveActiveProfileForWebsite(
  _websiteId: string,
): ProxyProfile | null {
  return null;
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
    proxyBypassRules: buildChromiumProxyBypassRules(
      undefined,
      process.env.POSTYBIRB_PORT,
    ),
  };
}

/** @deprecated Use resolveWebsiteFromPartition via proxy-partitions */
export function resolveWebsiteForPartition(
  partitionId: string,
  entries: PartitionEntry[],
) {
  return resolveWebsiteFromPartition(partitionId, entries);
}

export function resolveHttpRequestRoute(
  context: ProxyRequestContext,
): ProxyRoute {
  return resolveHttpRoute(context);
}

export function resolveBrowserProxySession(
  context: ProxyRequestContext,
): BrowserSessionRoute {
  return resolveBrowserSessionRoute(context);
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
  profile: ProxyProfile,
  force = false,
): Promise<void> {
  if (!partitionId?.trim()) {
    return;
  }

  const fingerprint = buildPartitionProxyFingerprint(profile);
  if (!force && appliedPartitionProxies.get(partitionId) === fingerprint) {
    return;
  }

  logger
    .withMetadata({
      partitionId,
      profileId: profile.id,
      enabled: profile.enabled,
    })
    .info('applyPartition');

  const partition = session.fromPartition(`persist:${partitionId}`);
  await applyProfileToSession(partition, profile, partitionId);
  appliedPartitionProxies.set(partitionId, fingerprint);
}

export async function applyProxySettings(): Promise<void> {
  await applyGlobalProxyConfig();
}
