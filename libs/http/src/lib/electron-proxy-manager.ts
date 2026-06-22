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
  resolveBrowserSessionRoute,
} from './proxy-route';

export type { PartitionEntry } from './proxy-partitions';
export type { ProxyRequestContext } from './proxy-route';

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

export function resolveBrowserProxySession(
  context: ProxyRequestContext,
): BrowserSessionRoute {
  return resolveBrowserSessionRoute(context);
}
