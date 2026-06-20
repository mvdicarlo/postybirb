// Electron network stack is used for fetch/axios in the main process.
// Node's native stack has no proxy integration, so fetch is patched to net.fetch
// and axios uses a resolver backed by session/app proxy configuration.

import { app, net, session } from 'electron';

import http from 'node:http';
import nodeHttps from 'node:https';
import nodeNet from 'node:net';
import nodeTLS from 'node:tls';
import { SocksProxyAgent } from 'socks-proxy-agent';

import { Agent, AgentConnectOpts } from 'agent-base';
import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';

import axios from 'axios';
import { format } from 'node:url';
import {
  buildProxyAgentUrl,
  isProxiedResolution,
  PostyBirbEnvConfig,
  shouldBypassProxyForUrl,
  StartupOptionsManager,
} from '@postybirb/utils/common';

import {
  applyProxySettings as applyProxySettingsInternal,
  ensurePartitionProxy,
  getActiveProxyConfiguration,
  onProxyConfigurationApplied,
  onSessionCreated,
  probeProfileConnection,
  resolveProfileForContext,
  resolveProxyForUrl,
  setPartitionIdProvider,
} from './electron-proxy-manager';

export {
  ensurePartitionProxy,
  getActiveProxyConfiguration,
  onProxyConfigurationApplied,
  probeProfileConnection,
  setPartitionIdProvider,
};
export {
  getProxyContext,
  runWithProxyContext,
  runWithProxyContextAsync,
} from './proxy-context';
export { isProxiedResolution } from '@postybirb/utils/common';

export async function applyProxySettings(
  configuration?: import('@postybirb/utils/common').ProxyConfiguration,
) {
  await applyProxySettingsInternal(configuration);
  proxyAgent?.clearCache();
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

function toResponseHeaders(headers: unknown): Headers {
  const normalizedHeaders = new Headers();
  if (!headers || typeof headers !== 'object') {
    return normalizedHeaders;
  }

  Object.entries(headers).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((entry) => {
        normalizedHeaders.append(key, String(entry));
      });
      return;
    }

    normalizedHeaders.append(key, String(value));
  });

  return normalizedHeaders;
}

function fetchThroughProfileAgent(
  input: FetchInput,
  init: RequestInit | undefined,
  profile: import('@postybirb/utils/common').ProxyProfile,
): Promise<Response> {
  const url = resolveFetchUrl(input);
  const method = resolveFetchMethod(input, init);
  const parsedUrl = new URL(url);
  const secure = parsedUrl.protocol === 'https:';
  const agentUrl = buildProxyAgentUrl(profile);
  if (!agentUrl) {
    return fetchThroughElectronNet(input, init);
  }

  const agent =
    profile.type === 'socks5'
      ? new SocksProxyAgent(agentUrl)
      : secure
        ? new HttpsProxyAgent(agentUrl)
        : new HttpProxyAgent(agentUrl);
  const lib = secure ? nodeHttps : http;

  return new Promise((resolve, reject) => {
    const headerSource =
      init?.headers ?? (input instanceof Request ? input.headers : undefined);
    const headers: Record<string, string> = {};
    if (headerSource) {
      new Headers(headerSource).forEach((value, key) => {
        headers[key] = value;
      });
    }

    const req = lib.request(
      parsedUrl,
      {
        method,
        headers,
        agent,
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
          const body = Buffer.concat(chunks);
          resolve(
            new Response(body, {
              status: response.statusCode ?? 500,
              statusText: response.statusMessage,
              headers: toResponseHeaders(response.headers),
            }),
          );
        });
        response.on('error', reject);
      },
    );

    if (init?.signal) {
      if (init.signal.aborted) {
        reject(new DOMException('The operation was aborted.', 'AbortError'));
        return;
      }
      init.signal.addEventListener('abort', () => req.destroy(), { once: true });
    }

    req.on('error', reject);

    const body = init?.body ?? (input instanceof Request ? input.body : null);
    if (body !== null && body !== undefined) {
      if (typeof body === 'string') {
        req.end(body);
        return;
      }
      if (body instanceof ArrayBuffer) {
        req.end(Buffer.from(body));
        return;
      }
      if (ArrayBuffer.isView(body)) {
        req.end(Buffer.from(body.buffer, body.byteOffset, body.byteLength));
        return;
      }
      if (body instanceof URLSearchParams) {
        req.end(body.toString());
        return;
      }
      if (body instanceof Blob) {
        body
          .arrayBuffer()
          .then((buffer) => req.end(Buffer.from(buffer)))
          .catch(reject);
        return;
      }
      reject(
        new Error(
          `Unsupported fetch body type for profile proxy requests: ${Object.prototype.toString.call(body)}`,
        ),
      );
      return;
    }

    req.end();
  });
}

global.fetch = async (
  input: FetchInput,
  init?: RequestInit,
): Promise<Response> => {
  const url = resolveFetchUrl(input);
  if (
    shouldBypassProxyForUrl(url, {
      appPort: PostyBirbEnvConfig.port,
    })
  ) {
    return fetchThroughElectronNet(input, init);
  }

  const profile = resolveProfileForContext();
  if (profile?.enabled && buildProxyAgentUrl(profile)) {
    return fetchThroughProfileAgent(input, init, profile);
  }

  return fetchThroughElectronNet(input, init);
};

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

class ElectronProxyAgent extends Agent {
  private agentsCache = new Map<string, Agent>();

  clearCache() {
    this.agentsCache.clear();
  }

  async connect(req: http.ClientRequest, options: AgentConnectOpts) {
    const secure = options.secureEndpoint;
    const url = format(req);

    let agent = this.agentsCache.get(url);
    if (!agent) {
      agent = await this.getAgent(url, secure);
      this.agentsCache.set(url, agent);
    }

    return agent.connect(req, options);
  }

  private getDirectAgent(secure: boolean): Agent {
    if (secure) {
      return nodeTLS as unknown as Agent;
    }
    return nodeNet as unknown as Agent;
  }

  private createProxyAgent(
    proxyUrl: string,
    secure: boolean,
  ): HttpProxyAgent<string> | HttpsProxyAgent<string> | SocksProxyAgent {
    if (proxyUrl.startsWith('socks5://') || proxyUrl.startsWith('socks4://')) {
      return new SocksProxyAgent(proxyUrl);
    }

    if (secure) {
      return new HttpsProxyAgent(proxyUrl);
    }
    return new HttpProxyAgent(proxyUrl);
  }

  private async resolveConfiguredProxyUrl(
    url: string,
    _secure: boolean,
  ): Promise<string | null> {
    const contextualProfile = resolveProfileForContext();
    if (contextualProfile?.enabled) {
      return buildProxyAgentUrl(contextualProfile);
    }

    const proxy = (await getParsedProxiesFor(url))[0];
    if (!proxy) {
      return null;
    }

    const port = proxy.port ? `:${proxy.port}` : '';
    const typeUpper = proxy.type.toUpperCase();
    if (typeUpper === 'SOCKS' || typeUpper === 'SOCKS5') {
      return `socks5://${proxy.hostname}${port}`;
    }

    const protocol = typeUpper === 'HTTPS' ? 'https' : 'http';
    return `${protocol}://${proxy.hostname}${port}`;
  }

  private async getAgent(url: string, secure: boolean): Promise<Agent> {
    if (
      shouldBypassProxyForUrl(url, {
        appPort: PostyBirbEnvConfig.port,
      })
    ) {
      return this.getDirectAgent(secure);
    }

    const proxyUrl = await this.resolveConfiguredProxyUrl(url, secure);
    if (!proxyUrl) {
      return this.getDirectAgent(secure);
    }

    return this.createProxyAgent(proxyUrl, secure);
  }
}

let proxyAgent: ElectronProxyAgent | null = null;

app.on('session-created', (sess) => {
  onSessionCreated(sess);
});

app.on('ready', () => {
  proxyAgent = new ElectronProxyAgent();
  axios.defaults.httpAgent = proxyAgent;
  axios.defaults.httpsAgent = proxyAgent;
  axios.defaults.proxy = false;

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
