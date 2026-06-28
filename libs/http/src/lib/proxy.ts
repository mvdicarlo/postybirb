import { net } from 'electron';
import { resolveProxyForUrl } from './electron-proxy';
import { parseProxyResolution } from './proxy-resolution';

type FetchInput = Request | URL | string;

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

const patchedElectronFetch = electronNetFetch as typeof fetch;
const globalFetchState = globalThis as typeof globalThis & {
  postybirbElectronFetchPatched?: boolean;
};

if (!globalFetchState.postybirbElectronFetchPatched) {
  globalFetchState.postybirbElectronFetchPatched = true;
  globalThis.fetch = patchedElectronFetch;
}

export async function getParsedProxiesFor(url: string) {
  const proxySources = await resolveProxyForUrl(url);
  if (!isProxiedResolution(proxySources)) {
    return [];
  }

  return parseProxyResolution(proxySources);
}

export function isProxiedResolution(resolution?: string | null): boolean {
  if (!resolution?.trim()) {
    return false;
  }

  return resolution
    .split(';')
    .map((part) => part.trim())
    .some((part) => part.length > 0 && part.toUpperCase() !== 'DIRECT');
}
