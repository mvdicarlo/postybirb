// Proxy bootstrap: applies settings on startup and exposes Electron net.fetch helpers.

import { app, net } from 'electron';
import {
  applyGlobalProxyConfig,
  applyProxySettings as applyProxySettingsInternal,
  getProxyConfiguration,
  onProxyConfigurationApplied,
  onSessionCreated,
  probePoolEntryConnection,
  probeProfileConnection,
  resolveProxyForUrl,
  setPartitionIdProvider,
} from './electron-proxy-manager';
import { isProxiedResolution, StartupOptionsManager } from '@postybirb/utils/common';

export {
  applyGlobalProxyConfig,
  getProxyConfiguration,
  onProxyConfigurationApplied,
  probePoolEntryConnection,
  probeProfileConnection,
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

export async function applyProxySettings(): Promise<void> {
  await applyProxySettingsInternal();
}

export async function applyGlobalProxyFromStartup(): Promise<void> {
  await applyGlobalProxyConfig();
}

type FetchInput = Request | URL | string;
type ParsedProxyEntry = {
  type: string;
  hostname: string;
  port: string;
};

function fetchThroughElectronNet(
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

/** Fetch via defaultSession; inherits global proxy/PAC from applyGlobalProxyConfig. */
export async function netFetch(
  input: FetchInput,
  init?: RequestInit,
): Promise<Response> {
  return fetchThroughElectronNet(input, init);
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

app.on('ready', () => {
  applyGlobalProxyConfig().catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Failed to apply proxy settings on startup', error);
  });

  StartupOptionsManager.onUpdate(() => {
    applyGlobalProxyConfig().catch((error) => {
      // eslint-disable-next-line no-console
      console.error('Failed to apply proxy settings', error);
    });
  });
});
