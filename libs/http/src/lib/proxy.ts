// Proxy bootstrap: patches global fetch and applies PAC/global proxy on startup.

import { app, net } from 'electron';
import { isProxiedResolution, StartupOptionsManager } from '@postybirb/utils/common';
import {
  applyGlobalProxyConfig,
  getProxyConfiguration,
  invalidateAppliedGlobalProxyFingerprint,
  onProxyConfigurationApplied,
  onSessionCreated,
  probePoolEntryConnection,
  resolveProxyForUrl,
  setPartitionIdProvider,
} from './electron-proxy-manager';

export {
  applyGlobalProxyConfig,
  getProxyConfiguration,
  invalidateAppliedGlobalProxyFingerprint,
  onProxyConfigurationApplied,
  probePoolEntryConnection,
  resolveProxyForUrl,
  setPartitionIdProvider,
};
export { resolveTelegramSocksProxy } from './telegram-proxy';
export type { TelegramSocksProxySettings } from './telegram-proxy';
export { isProxiedResolution } from '@postybirb/utils/common';
export {
  getHeadlessWebsitePartitionId,
  getInstagramOAuthPartitionId,
} from './proxy-partitions';

type FetchInput = Request | URL | string;
type ParsedProxyEntry = {
  type: string;
  hostname: string;
  port: string;
};

/**
 * Routes fetch through Electron's network stack (defaultSession).
 * Inherits global proxy/PAC from {@link applyGlobalProxyConfig}.
 */
function electronNetFetch(
  input: FetchInput,
  init?: RequestInit,
): Promise<Response> {
  if (input instanceof Request) {
    if (!init) {
      return net.fetch(input.url, input);
    }
    return net.fetch(input.url, init);
  }

  return net.fetch(input.toString(), init);
}

const patchedElectronFetch = electronNetFetch as typeof fetch & {
  __postybirbElectronFetch?: boolean;
};

if (!patchedElectronFetch.__postybirbElectronFetch) {
  patchedElectronFetch.__postybirbElectronFetch = true;
  globalThis.fetch = patchedElectronFetch;
}

function parseProxySection(section: string): ParsedProxyEntry | null {
  const trimmed = section.trim();
  if (!trimmed || trimmed.toUpperCase() === 'DIRECT') {
    return null;
  }

  const spaceIndex = trimmed.indexOf(' ');
  if (spaceIndex === -1) {
    return null;
  }

  const type = trimmed.slice(0, spaceIndex).trim();
  const proxyUrl = trimmed.slice(spaceIndex + 1).trim();
  if (!proxyUrl) {
    return null;
  }

  try {
    const parsed = new URL(
      proxyUrl.includes('://') ? proxyUrl : `http://${proxyUrl}`,
    );
    return {
      type,
      hostname: parsed.hostname,
      port: parsed.port,
    };
  } catch {
    const hostPort = proxyUrl.match(/^([^:]+):(\d+)$/);
    if (hostPort) {
      return {
        type,
        hostname: hostPort[1],
        port: hostPort[2],
      };
    }
  }

  return null;
}

export async function getParsedProxiesFor(url: string) {
  const proxySources = await resolveProxyForUrl(url);
  if (!isProxiedResolution(proxySources)) {
    return [];
  }

  const parsedProxies = proxySources
    .split(';')
    .map((section: string) => parseProxySection(section))
    .filter((entry): entry is ParsedProxyEntry => entry !== null);

  return parsedProxies;
}

app.on('session-created', (sess) => {
  onSessionCreated(sess);
});

StartupOptionsManager.onUpdate(() => {
  invalidateAppliedGlobalProxyFingerprint();
  applyGlobalProxyConfig().catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Failed to apply proxy settings', error);
  });
});
