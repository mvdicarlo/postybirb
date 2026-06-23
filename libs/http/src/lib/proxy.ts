// Proxy bootstrap: patches global fetch and applies PAC/global proxy on startup.

import { app, net } from 'electron';
import { isProxiedResolution } from '@postybirb/utils/common';
import {
  applyProxy,
  getProxyConfiguration,
  onProxyConfigurationApplied,
  onSessionCreated,
  resolveProxyForUrl,
} from './electron-proxy';
import { parseProxyResolution } from './proxy-resolution';

export {
  applyProxy,
  getProxyConfiguration,
  onProxyConfigurationApplied,
  resolveProxyForUrl,
};
export { isProxiedResolution } from '@postybirb/utils/common';

type FetchInput = Request | URL | string;

/**
 * Routes fetch through Electron's network stack (defaultSession).
 * Inherits global proxy/PAC from {@link applyProxy}.
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

export async function getParsedProxiesFor(url: string) {
  const proxySources = await resolveProxyForUrl(url);
  if (!isProxiedResolution(proxySources)) {
    return [];
  }

  return parseProxyResolution(proxySources);
}

app.on('session-created', (sess) => {
  onSessionCreated(sess);
});
