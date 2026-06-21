import { randomBytes } from 'node:crypto';
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
  asEnabledProxyProfile,
  buildProxyAgentUrl,
  buildSessionProxyRules,
  buildChromiumProxyBypassRules,
  createProxyAgent,
  defaultProxyConfiguration,
  normalizeProxyConfiguration,
  PostyBirbEnvConfig,
  ProxyConfiguration,
  ProxyPoolEntry,
  ProxyProfile,
  StartupOptionsManager,
} from '@postybirb/utils/common';
import { ProxyAuthStore, ProxyPoolAuthEntry } from './proxy-auth-store';
import {
  collectManagedPartitionIds,
  type PartitionEntry,
} from './proxy-partitions';

type ProbeOptions = {
  method?: 'GET' | 'HEAD';
  timeoutMs?: number;
};

type ProbeResult = {
  statusCode: number;
};

type PartitionIdProvider = () => Promise<PartitionEntry[]> | PartitionEntry[];

type ProxyConfigurationListener = () => void | Promise<void>;

const logger = Logger('GlobalProxyManager');
const proxyAuthStore = new ProxyAuthStore();

let getPartitionEntries: PartitionIdProvider = () => [];
let activeProxyConfiguration: ProxyConfiguration = defaultProxyConfiguration();
const proxyConfigurationListeners = new Set<ProxyConfigurationListener>();
let appProxyLoginHandlerRegistered = false;
let appliedGlobalFingerprint = '';

function readStartupProxyConfiguration(): ProxyConfiguration {
  try {
    return normalizeProxyConfiguration(StartupOptionsManager.get().proxy);
  } catch {
    return defaultProxyConfiguration();
  }
}

function buildGlobalProxyFingerprint(config: ProxyConfiguration): string {
  return JSON.stringify({
    mode: config.mode,
    fixedProxyId: config.fixedProxyId ?? null,
    pacAccessToken: config.pacAccessToken ?? null,
    pool: config.pool.map((entry) => ({
      id: entry.id,
      type: entry.type,
      host: entry.host,
      port: entry.port,
      username: entry.username,
    })),
    routing: config.routing,
  });
}

function buildPacScriptUrl(config: ProxyConfiguration): string {
  const port = PostyBirbEnvConfig.port;
  return `http://127.0.0.1:${port}/api/proxy/pac/${config.pacAccessToken}`;
}

function resolveSessionProxyConfig(config: ProxyConfiguration): ProxyConfig {
  switch (config.mode) {
    case 'direct':
      return { mode: 'direct' };
    case 'fixed_servers': {
      const entry = config.pool.find((poolEntry) => poolEntry.id === config.fixedProxyId);
      if (!entry) {
        return { mode: 'system' };
      }

      const proxyRules = buildSessionProxyRules(asEnabledProxyProfile(entry));
      if (!proxyRules) {
        return { mode: 'system' };
      }

      return {
        mode: 'fixed_servers',
        proxyRules,
        proxyBypassRules: buildChromiumProxyBypassRules(),
      };
    }
    case 'pac_routing': {
      if (!config.pacAccessToken?.trim()) {
        return { mode: 'system' };
      }

      return {
        mode: 'pac_script',
        pacScript: buildPacScriptUrl(config),
      };
    }
    case 'system':
    default:
      return { mode: 'system' };
  }
}

function ensurePacAccessToken(config: ProxyConfiguration): ProxyConfiguration {
  if (config.mode !== 'pac_routing' || config.pacAccessToken?.trim()) {
    return config;
  }

  const updated = {
    ...config,
    pacAccessToken: randomBytes(24).toString('hex'),
  };

  try {
    StartupOptionsManager.set({ proxy: updated });
  } catch {
    // Startup options may be unavailable in isolated tests.
  }

  return updated;
}

function toPoolAuthEntries(pool: ProxyPoolEntry[]): ProxyPoolAuthEntry[] {
  return pool.map((entry) => ({
    id: entry.id,
    type: entry.type,
    host: entry.host,
    port: entry.port,
    username: entry.username,
    password: entry.password,
  }));
}

async function applyProxyConfigToSession(
  targetSession: Session,
  config: ProxyConfig,
): Promise<void> {
  await targetSession.setProxy(config);
  targetSession.closeAllConnections();
}

async function applyAppLevelProxy(config: ProxyConfig): Promise<void> {
  const setAppProxy = (
    app as typeof app & {
      setProxy?: (proxyConfig: ProxyConfig) => Promise<void>;
    }
  ).setProxy;

  if (typeof setAppProxy === 'function') {
    await setAppProxy.call(app, config);
  }
}

function collectWebsiteIdsForPartitionRefresh(
  config: ProxyConfiguration,
  accountEntries: PartitionEntry[],
): string[] {
  const websiteIds = new Set<string>();

  for (const entry of accountEntries) {
    websiteIds.add(entry.websiteId);
  }

  for (const websiteId of Object.keys(config.routing)) {
    websiteIds.add(websiteId);
  }

  return [...websiteIds];
}

function ensureAppProxyLoginHandler(): void {
  if (appProxyLoginHandlerRegistered || typeof app?.on !== 'function') {
    return;
  }

  appProxyLoginHandlerRegistered = true;
  app.on('login', (event, _webContents, _details, authInfo, callback) => {
    if (!authInfo.isProxy) {
      return;
    }

    const credentials = proxyAuthStore.resolveForProxyChallenge(authInfo);
    if (!credentials) {
      return;
    }

    event.preventDefault();
    callback(credentials.username, credentials.password);
  });
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

export async function getManagedPartitionEntries(): Promise<PartitionEntry[]> {
  return Promise.resolve(getPartitionEntries());
}

export function getProxyConfiguration(): ProxyConfiguration {
  return normalizeProxyConfiguration({
    ...activeProxyConfiguration,
    pool: activeProxyConfiguration.pool.map((entry) => ({ ...entry })),
    routing: { ...activeProxyConfiguration.routing },
  });
}

export function attachProxyAuthToRequest(
  request: ClientRequest,
  _partitionId?: string,
): void {
  request.on('login', (authInfo, callback) => {
    if (!authInfo.isProxy) {
      callback();
      return;
    }

    const credentials = proxyAuthStore.resolveForProxyChallenge(authInfo);
    if (!credentials) {
      callback();
      return;
    }

    callback(credentials.username, credentials.password);
  });
}

async function getAccountPartitionEntries(): Promise<PartitionEntry[]> {
  return Promise.resolve(getPartitionEntries());
}

export async function refreshAllPartitionSessions(
  config: ProxyConfiguration,
  accountEntries: PartitionEntry[],
): Promise<void> {
  const proxyConfig = resolveSessionProxyConfig(config);
  const websiteIds = collectWebsiteIdsForPartitionRefresh(
    config,
    accountEntries,
  );
  const partitionIds = collectManagedPartitionIds(accountEntries, websiteIds);

  await Promise.all(
    partitionIds.map(async (partitionId) => {
      const partition = session.fromPartition(`persist:${partitionId}`);
      await applyProxyConfigToSession(partition, proxyConfig);
    }),
  );
}

export async function applyGlobalProxyConfig(
  configuration?: ProxyConfiguration,
): Promise<void> {
  ensureAppProxyLoginHandler();

  let resolvedConfiguration =
    configuration !== undefined
      ? normalizeProxyConfiguration(configuration)
      : readStartupProxyConfiguration();

  resolvedConfiguration = ensurePacAccessToken(resolvedConfiguration);

  const fingerprint = buildGlobalProxyFingerprint(resolvedConfiguration);
  const poolEntries = toPoolAuthEntries(resolvedConfiguration.pool);

  proxyAuthStore.syncPool(poolEntries);
  activeProxyConfiguration = resolvedConfiguration;

  if (!app.isReady()) {
    return;
  }

  if (fingerprint === appliedGlobalFingerprint) {
    logger.withMetadata({ mode: resolvedConfiguration.mode }).debug('unchanged');
    return;
  }

  const proxyConfig = resolveSessionProxyConfig(resolvedConfiguration);
  const accountEntries = await getAccountPartitionEntries();

  logger
    .withMetadata({
      mode: resolvedConfiguration.mode,
      poolSize: resolvedConfiguration.pool.length,
      partitionCount: collectManagedPartitionIds(
        accountEntries,
        collectWebsiteIdsForPartitionRefresh(resolvedConfiguration, accountEntries),
      ).length,
    })
    .info('applyGlobal');

  await applyProxyConfigToSession(session.defaultSession, proxyConfig);
  await applyAppLevelProxy(proxyConfig);
  await refreshAllPartitionSessions(resolvedConfiguration, accountEntries);

  appliedGlobalFingerprint = fingerprint;
  await notifyProxyConfigurationApplied();
}

export async function resolveProxyForUrl(url: string): Promise<string> {
  return session.defaultSession.resolveProxy(url);
}

export async function probeProfileConnection(
  profile: ProxyProfile,
  url: string,
  options: ProbeOptions = {},
): Promise<ProbeResult> {
  return probePoolEntryConnection(profile, url, options);
}

export async function probePoolEntryConnection(
  entry: ProxyPoolEntry,
  url: string,
  options: ProbeOptions = {},
): Promise<ProbeResult> {
  const profile = asEnabledProxyProfile(entry);
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
  if (!app.isReady()) {
    return;
  }

  const proxyConfig = resolveSessionProxyConfig(activeProxyConfiguration);
  await applyProxyConfigToSession(createdSession, proxyConfig);
}

export function resetGlobalProxyStateForTests(): void {
  appliedGlobalFingerprint = '';
  activeProxyConfiguration = defaultProxyConfiguration();
  proxyAuthStore.clear();
}

export function syncLegacyPartitionProfile(
  partitionId: string,
  profile: ProxyProfile | null,
): void {
  proxyAuthStore.syncPartitionProfile(partitionId, profile);
}

export function clearProxyAuthStore(): void {
  proxyAuthStore.clear();
}
