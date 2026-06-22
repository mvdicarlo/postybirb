import {
  applyGlobalProxyConfig,
  attachProxyAuthToRequest,
  getManagedPartitionEntries,
  getProxyConfiguration,
  invalidateAppliedGlobalProxyFingerprint,
  onProxyConfigurationApplied,
  onSessionCreated,
  probePoolEntryConnection,
  refreshAllPartitionSessions,
  resolveProxyForUrl,
  resetGlobalProxyStateForTests,
  setPartitionIdProvider,
} from './global-proxy-manager';
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
  getManagedPartitionEntries,
  getProxyConfiguration,
  invalidateAppliedGlobalProxyFingerprint,
  onProxyConfigurationApplied,
  onSessionCreated,
  probePoolEntryConnection,
  refreshAllPartitionSessions,
  resolveProxyForUrl,
  resetGlobalProxyStateForTests,
  setPartitionIdProvider,
};

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
