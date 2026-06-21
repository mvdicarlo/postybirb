// Proxy bootstrap: applies settings on startup and exposes explicit fetch helpers.
// Do not patch global.fetch — use fetchForWebsite(websiteId, ...) in the main process.

import { app, net } from 'electron';
import {
  applyProxySettings as applyProxySettingsInternal,
  ensurePartitionProxy,
  getActiveProxyConfiguration,
  onProxyConfigurationApplied,
  onSessionCreated,
  probeProfileConnection,
  resolveHttpRequestRoute,
  resolveProxyForUrl,
  setPartitionIdProvider,
} from './electron-proxy-manager';
import {
  isProxiedResolution,
  LegacyProxyConfiguration,
  PostyBirbEnvConfig,
  shouldBypassProxyForUrl,
  StartupOptionsManager,
} from '@postybirb/utils/common';
import { requestViaProfileAgent } from './profile-agent-request';

export {
  ensurePartitionProxy,
  getActiveProxyConfiguration,
  onProxyConfigurationApplied,
  probeProfileConnection,
  resolveHttpRequestRoute,
  setPartitionIdProvider,
};
export { isProxiedResolution } from '@postybirb/utils/common';
export {
  getHeadlessWebsitePartitionId,
  getInstagramOAuthPartitionId,
} from './proxy-partitions';

export async function applyProxySettings(
  configuration?: LegacyProxyConfiguration,
) {
  await applyProxySettingsInternal(configuration);
}

type FetchInput = Request | URL | string;
type ParsedProxyEntry = {
  type: string;
  hostname: string;
  port: string;
};

function resolveFetchUrl(input: FetchInput): string {
  if (input instanceof Request) {
    return input.url;
  }
  if (input instanceof URL) {
    return input.toString();
  }
  return input;
}

function resolveFetchMethod(
  input: FetchInput,
  init?: RequestInit,
): string {
  if (init?.method) {
    return init.method.toUpperCase();
  }
  if (input instanceof Request) {
    return input.method.toUpperCase();
  }
  return 'GET';
}

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

function fetchThroughProfileAgent(
  input: FetchInput,
  init: RequestInit | undefined,
  profile: import('@postybirb/utils/common').ProxyProfile,
): Promise<Response> {
  const url = resolveFetchUrl(input);
  const method = resolveFetchMethod(input, init);
  const headerSource =
    init?.headers ?? (input instanceof Request ? input.headers : undefined);
  const headers: Record<string, string> = {};
  if (headerSource) {
    new Headers(headerSource).forEach((value, key) => {
      headers[key] = value;
    });
  }

  const body = readFetchBody(input, init);

  return requestViaProfileAgent<ArrayBuffer>(profile, url, {
    method,
    headers,
    body: body ?? undefined,
  }).then((response) => {
    const responseBody =
      typeof response.body === 'string'
        ? response.body
        : Buffer.from(response.body as unknown as ArrayBuffer);

    return new Response(responseBody, {
      status: response.statusCode,
      statusText: response.statusMessage,
    });
  });
}

function readFetchBody(
  input: FetchInput,
  init?: RequestInit,
): Buffer | null {
  const body = init?.body ?? (input instanceof Request ? input.body : null);
  if (body === null || body === undefined) {
    return null;
  }
  if (typeof body === 'string') {
    return Buffer.from(body);
  }
  if (body instanceof ArrayBuffer) {
    return Buffer.from(body);
  }
  if (ArrayBuffer.isView(body)) {
    return Buffer.from(body.buffer, body.byteOffset, body.byteLength);
  }
  if (body instanceof URLSearchParams) {
    return Buffer.from(body.toString());
  }

  return null;
}

export async function fetchForWebsite(
  websiteId: string,
  input: FetchInput,
  init?: RequestInit,
): Promise<Response> {
  const url = resolveFetchUrl(input);
  if (
    shouldBypassProxyForUrl(url, {
      appPort: PostyBirbEnvConfig.port,
    })
  ) {
    return fetchThroughElectronNet(input, init);
  }

  const route = await resolveHttpRequestRoute({ websiteId });
  if (route.transport === 'node-agent') {
    return fetchThroughProfileAgent(input, init, route.profile);
  }

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
  applyProxySettings().catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Failed to apply proxy settings on startup', error);
  });

  StartupOptionsManager.onUpdate(() => {
    applyProxySettings().catch((error) => {
      // eslint-disable-next-line no-console
      console.error('Failed to apply proxy settings', error);
    });
  });
});
