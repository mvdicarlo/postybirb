import {
  app,
  ClientRequest,
  session,
  Session,
  type ProxyConfig,
} from 'electron';
import http from 'node:http';
import nodeHttps from 'node:https';
import { Logger } from '@postybirb/logger';
import {
  buildProxyAgentUrl,
  buildSessionProxyRules,
  createProxyAgent,
  ProxyConfiguration,
  ProxyProfile,
  resolveProfileForWebsite,
  StartupOptionsManager,
} from '@postybirb/utils/common';
import { ProxyAuthStore } from './proxy-auth-store';
import {
  collectManagedPartitionIds,
  resolveWebsiteFromPartition,
  type PartitionEntry,
} from './proxy-partitions';
import {
  BrowserSessionRoute,
  collectWebsiteIdsWithEnabledProfiles,
  createPartitionWebsiteResolver,
  ProxyRequestContext,
  ProxyRoute,
  resolveBrowserSessionRoute,
  resolveHttpRoute,
  resolveProfileForPartition,
} from './proxy-route';

export type { PartitionEntry } from './proxy-partitions';
export type { ProxyRequestContext, ProxyRoute } from './proxy-route';

type ProbeOptions = {
  method?: 'GET' | 'HEAD';
  timeoutMs?: number;
};

type ProbeResult = {
  statusCode: number;
};

type PartitionIdProvider = () => Promise<PartitionEntry[]> | PartitionEntry[];

type ProxyConfigurationListener = () => void | Promise<void>;

const logger = Logger('ProxyManager');
const proxyAuthStore = new ProxyAuthStore();

let getPartitionEntries: PartitionIdProvider = () => [];
let activeProxyConfiguration: ProxyConfiguration = { profiles: [] };
const proxyConfigurationListeners = new Set<ProxyConfigurationListener>();
let appProxyLoginHandlerRegistered = false;
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

export function resolveActiveProfileForWebsite(
  websiteId: string,
): ProxyProfile | null {
  return resolveProfileForWebsite(websiteId, activeProxyConfiguration);
}

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
    return { profiles: [] };
  }
}

activeProxyConfiguration = readStartupProxyConfiguration();

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
    proxyBypassRules: '<-loopback>',
  };
}

function findPartitionIdForSession(targetSession: Session): string | null {
  for (const partitionId of proxyAuthStore.getPartitionIds()) {
    if (session.fromPartition(`persist:${partitionId}`) === targetSession) {
      return partitionId;
    }
  }

  return null;
}

if (!appProxyLoginHandlerRegistered) {
  appProxyLoginHandlerRegistered = true;
  app.on('login', (event, webContents, _details, authInfo, callback) => {
    if (!authInfo.isProxy) {
      return;
    }

    const credentials = webContents
      ? proxyAuthStore.getForSession(
          webContents.session,
          findPartitionIdForSession,
        )
      : null;
    if (!credentials) {
      return;
    }

    event.preventDefault();
    callback(credentials.username, credentials.password);
  });
}

/** @deprecated Use resolveWebsiteFromPartition via proxy-partitions */
export function resolveWebsiteForPartition(
  partitionId: string,
  entries: PartitionEntry[],
) {
  return resolveWebsiteFromPartition(partitionId, entries);
}

async function getAccountPartitionEntries(): Promise<PartitionEntry[]> {
  return Promise.resolve(getPartitionEntries());
}

async function createActivePartitionWebsiteResolver() {
  const entries = await getAccountPartitionEntries();
  return createPartitionWebsiteResolver(entries);
}

export async function resolveHttpRequestRoute(
  context: ProxyRequestContext,
): Promise<ProxyRoute> {
  const resolvePartitionWebsite = await createActivePartitionWebsiteResolver();
  return resolveHttpRoute(
    context,
    resolvePartitionWebsite,
    activeProxyConfiguration,
  );
}

export async function resolveBrowserProxySession(
  context: ProxyRequestContext,
): Promise<BrowserSessionRoute> {
  const resolvePartitionWebsite = await createActivePartitionWebsiteResolver();
  return resolveBrowserSessionRoute(
    context,
    resolvePartitionWebsite,
    activeProxyConfiguration,
  );
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
    proxyAuthStore.bindSession(partitionId, targetSession);
    proxyAuthStore.syncPartitionProfile(partitionId, profile);
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

export function attachProxyAuthToRequest(
  request: ClientRequest,
  partitionId?: string,
): void {
  request.on('login', (authInfo, callback) => {
    if (!authInfo.isProxy) {
      callback();
      return;
    }

    const credentials = proxyAuthStore.getForPartition(partitionId);
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
  force = false,
): Promise<void> {
  if (!partitionId?.trim()) {
    return;
  }

  let resolvedProfile = profile ?? null;
  if (!resolvedProfile) {
    const entries = await getAccountPartitionEntries();
    const resolvePartitionWebsite = createPartitionWebsiteResolver(entries);
    resolvedProfile = resolveProfileForPartition(
      partitionId,
      resolvePartitionWebsite,
      activeProxyConfiguration,
    );
  }

  const fingerprint = buildPartitionProxyFingerprint(resolvedProfile);
  if (!force && appliedPartitionProxies.get(partitionId) === fingerprint) {
    return;
  }

  logger
    .withMetadata({
      partitionId,
      profileId: resolvedProfile?.id ?? null,
      enabled: resolvedProfile?.enabled ?? false,
    })
    .info('applyPartition');

  const partition = session.fromPartition(`persist:${partitionId}`);
  await applyProfileToSession(partition, resolvedProfile, partitionId);
  appliedPartitionProxies.set(partitionId, fingerprint);
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

  clearPartitionProxyCache();
  proxyAuthStore.clear();

  if (!app.isReady()) {
    return;
  }

  await applyProfileToSession(session.defaultSession, null);

  const entries = await getAccountPartitionEntries();
  const websiteIds = collectWebsiteIdsWithEnabledProfiles(
    activeProxyConfiguration,
  );
  const partitionIds = collectManagedPartitionIds(entries, websiteIds);

  await Promise.all(
    partitionIds.map((partitionId) =>
      ensurePartitionProxy(partitionId, undefined, true),
    ),
  );

  await notifyProxyConfigurationApplied();
}

export async function resolveProxyForUrl(url: string): Promise<string> {
  return session.defaultSession.resolveProxy(url);
}

/**
 * Probes outbound connectivity through a specific profile using Node proxy agents.
 */
export async function probeProfileConnection(
  profile: ProxyProfile,
  url: string,
  options: ProbeOptions = {},
): Promise<ProbeResult> {
  const agentUrl = buildProxyAgentUrl(profile);
  if (!agentUrl) {
    throw new Error('Proxy host and port are required');
  }

  const parsedUrl = new URL(url);
  const secure = parsedUrl.protocol === 'https:';
  const agent = createProxyAgent(profile, secure);
  if (!agent) {
    throw new Error('Proxy host and port are required');
  }
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
  if (createdSession !== session.defaultSession) {
    return;
  }

  await createdSession.setProxy(getSystemProxyConfig());
}
