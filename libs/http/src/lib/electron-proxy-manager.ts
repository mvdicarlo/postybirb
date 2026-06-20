import { app, ClientRequest, session, Session } from 'electron';
import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import http from 'node:http';
import nodeHttps from 'node:https';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { WebsiteId } from '@postybirb/types';
import {
  buildProxyAgentUrl,
  buildProxyRules,
  DEFAULT_PROXY_CONFIGURATION,
  normalizeProxyProfile,
  ProxyConfiguration,
  ProxyProfile,
  resolveProfileForWebsite,
  StartupOptionsManager,
} from '@postybirb/utils/common';
import { getProxyContext } from './proxy-context';

export type PartitionEntry = {
  partitionId: string;
  websiteId: WebsiteId;
};

type PartitionIdProvider = () => Promise<PartitionEntry[]> | PartitionEntry[];

type ProbeOptions = {
  method?: 'GET' | 'HEAD';
  timeoutMs?: number;
};

type ProbeResult = {
  statusCode: number;
};

type ProxyConfigurationListener = () => void | Promise<void>;

const PROXY_LOG_LEVEL = (process.env.LOG_LEVEL ?? 'debug').toLowerCase();

function proxyManagerInfo(
  message: string,
  context?: Record<string, unknown>,
): void {
  if (PROXY_LOG_LEVEL === 'error' || PROXY_LOG_LEVEL === 'warn') {
    return;
  }

  if (context) {
    // eslint-disable-next-line no-console
    console.info(message, context);
    return;
  }

  // eslint-disable-next-line no-console
  console.info(message);
}

let getPartitionEntries: PartitionIdProvider = () => [];
let activeProxyConfiguration: ProxyConfiguration = {
  ...DEFAULT_PROXY_CONFIGURATION,
  profiles: [],
};
const partitionAuthCredentials = new Map<
  string,
  { username: string; password: string }
>();
const proxyConfigurationListeners = new Set<ProxyConfigurationListener>();

function readStartupProxyConfiguration(): ProxyConfiguration {
  try {
    const { proxy } = StartupOptionsManager.get();
    return {
      profiles: proxy.profiles.map((profile) => ({
        ...profile,
        websites: [...profile.websites],
      })),
    };
  } catch {
    return { ...DEFAULT_PROXY_CONFIGURATION, profiles: [] };
  }
}

activeProxyConfiguration = readStartupProxyConfiguration();

function getSystemProxyConfig(): Electron.ProxyConfig {
  return { mode: 'system' };
}

function getFixedProxyConfig(profile: ProxyProfile): Electron.ProxyConfig {
  const proxyRules = buildProxyRules(profile);
  if (!proxyRules) {
    return getSystemProxyConfig();
  }

  return {
    mode: 'fixed_servers',
    proxyRules,
    proxyBypassRules: '<-loopback>',
  };
}

function storePartitionAuth(partitionId: string, profile: ProxyProfile): void {
  if (profile.username && profile.password) {
    partitionAuthCredentials.set(partitionId, {
      username: profile.username,
      password: profile.password,
    });
    return;
  }

  partitionAuthCredentials.delete(partitionId);
}

export function resolveWebsiteForPartition(
  partitionId: string,
  entries: PartitionEntry[],
): WebsiteId | null {
  if (!partitionId?.trim()) {
    return null;
  }

  const oauthMatch = partitionId.match(/^instagram-oauth-(.+)$/);
  if (oauthMatch) {
    return 'instagram';
  }

  return entries.find((entry) => entry.partitionId === partitionId)?.websiteId ?? null;
}

async function applyProfileToSession(
  targetSession: Session,
  profile: ProxyProfile | null,
  partitionId?: string,
): Promise<void> {
  const normalized = profile ? normalizeProxyProfile(profile) : null;
  const config =
    normalized && normalized.enabled
      ? getFixedProxyConfig(normalized)
      : getSystemProxyConfig();

  await targetSession.setProxy(config);

  if (partitionId) {
    if (normalized?.enabled) {
      storePartitionAuth(partitionId, normalized);
    } else {
      partitionAuthCredentials.delete(partitionId);
    }
  }

  targetSession.closeAllConnections();
}

export function onProxyConfigurationApplied(
  listener: ProxyConfigurationListener,
): () => void {
  proxyConfigurationListeners.add(listener);
  return () => proxyConfigurationListeners.delete(listener);
}

async function notifyProxyConfigurationApplied(): Promise<void> {
  await Promise.all(
    [...proxyConfigurationListeners].map((listener) => listener()),
  );
}

export function setPartitionIdProvider(provider: PartitionIdProvider): void {
  getPartitionEntries = provider;
}

export function getActiveProxyConfiguration(): ProxyConfiguration {
  return {
    profiles: activeProxyConfiguration.profiles.map((profile) => ({
      ...profile,
      websites: [...profile.websites],
    })),
  };
}

export function resolveProfileForContext(): ProxyProfile | null {
  const context = getProxyContext();
  if (!context.websiteId) {
    return null;
  }

  return resolveProfileForWebsite(
    context.websiteId,
    getActiveProxyConfiguration(),
  );
}

export function getProfileAuthFromContext():
  | { username: string; password: string }
  | null {
  const profile = resolveProfileForContext();
  if (
    !profile?.enabled ||
    !profile.username.trim() ||
    !profile.password.trim()
  ) {
    return null;
  }

  return {
    username: profile.username,
    password: profile.password,
  };
}

export function attachProxyAuthToRequest(
  request: ClientRequest,
  partitionId?: string,
): void {
  type LoginCallback = (username?: string, password?: string) => void;
  type ProxyLoginRequest = {
    on: (
      event: 'login',
      listener: (authInfo: Electron.AuthInfo, callback: LoginCallback) => void,
    ) => ClientRequest;
  };
  const proxyLoginRequest = request as unknown as ProxyLoginRequest;
  proxyLoginRequest.on('login', (authInfo, callback) => {
    if (!authInfo?.isProxy) {
      callback();
      return;
    }

    const credentials =
      (partitionId ? partitionAuthCredentials.get(partitionId) : undefined) ??
      getProfileAuthFromContext();
    if (!credentials) {
      callback();
      return;
    }

    callback(credentials.username, credentials.password);
  });
}

export async function ensurePartitionProxy(
  partitionId: string,
  profile?: ProxyProfile,
): Promise<void> {
  if (!partitionId?.trim()) {
    return;
  }

  let resolvedProfile = profile ?? null;
  if (!resolvedProfile) {
    const entries = await Promise.resolve(getPartitionEntries());
    const websiteId = resolveWebsiteForPartition(partitionId, entries);
    resolvedProfile = websiteId
      ? resolveProfileForWebsite(websiteId, activeProxyConfiguration)
      : null;
  }

  proxyManagerInfo('[ProxyManager.applyPartition]', {
    partitionId,
    profileId: resolvedProfile?.id ?? null,
    enabled: resolvedProfile?.enabled ?? false,
  });

  const partition = session.fromPartition(`persist:${partitionId}`);
  await applyProfileToSession(partition, resolvedProfile, partitionId);
}

export async function applyProxySettings(
  configuration?: ProxyConfiguration,
): Promise<void> {
  activeProxyConfiguration =
    configuration !== undefined
      ? {
          profiles: configuration.profiles.map((profile) => ({
            ...profile,
            websites: [...profile.websites],
          })),
        }
      : readStartupProxyConfiguration();

  if (!app.isReady()) {
    return;
  }

  await applyProfileToSession(session.defaultSession, null);

  const entries = await Promise.resolve(getPartitionEntries());
  await Promise.all(
    entries.map(({ partitionId }) => ensurePartitionProxy(partitionId)),
  );

  await notifyProxyConfigurationApplied();
}

export async function resolveProxyForUrl(url: string): Promise<string> {
  return session.defaultSession.resolveProxy(url);
}

/**
 * Probes outbound connectivity through a specific profile using Node proxy agents.
 * This matches Path B routing and supports HTTP(S) auth embedded in the agent URL.
 */
export async function probeProfileConnection(
  profile: ProxyProfile,
  url: string,
  options: ProbeOptions = {},
): Promise<ProbeResult> {
  const normalized = normalizeProxyProfile(profile);
  const agentUrl = buildProxyAgentUrl(normalized);
  if (!agentUrl) {
    throw new Error('Proxy host and port are required');
  }

  const parsedUrl = new URL(url);
  const secure = parsedUrl.protocol === 'https:';
  const agent =
    normalized.type === 'socks5'
      ? new SocksProxyAgent(agentUrl)
      : secure
        ? new HttpsProxyAgent(agentUrl)
        : new HttpProxyAgent(agentUrl);
  const lib = secure ? nodeHttps : http;
  const method = options.method ?? 'HEAD';
  const timeoutMs = options.timeoutMs ?? 15_000;

  return new Promise((resolve, reject) => {
    let timeout: NodeJS.Timeout | undefined;

    const req = lib.request(
      parsedUrl,
      {
        method,
        agent,
      },
      (response) => {
        if (timeout) {
          clearTimeout(timeout);
        }
        response.resume();
        resolve({ statusCode: response.statusCode ?? 0 });
      },
    );

    timeout = setTimeout(() => {
      req.destroy(new Error('Probe timed out'));
    }, timeoutMs);

    req.on('error', (error) => {
      if (timeout) {
        clearTimeout(timeout);
      }
      reject(error);
    });

    req.end();
  });
}

export async function onSessionCreated(createdSession: Session): Promise<void> {
  await createdSession.setProxy(getSystemProxyConfig());
}
