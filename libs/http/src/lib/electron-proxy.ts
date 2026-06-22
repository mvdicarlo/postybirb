import {
  app,
  ClientRequest,
  session,
  Session,
  type ProxyConfig,
} from 'electron';
import { Logger } from '@postybirb/logger';
import type {
  ProxyConfiguration,
  ProxyPoolEntry,
} from '@postybirb/types';
import {
  toEnabledProxyProfile,
  buildSessionProxyRules,
  buildChromiumProxyBypassRules,
  cloneProxyConfiguration,
  defaultProxyConfiguration,
  prepareProxyConfiguration,
  PostyBirbEnvConfig,
  StartupOptionsManager,
  toError,
} from '@postybirb/utils/common';
import { ProxyAuthStore, ProxyPoolAuthEntry } from './proxy-auth-store';
import { trustPostyBirbLocalCertificate } from './local-certificate-trust';

type ProxyConfigurationListener = () => void | Promise<void>;

const logger = Logger('ElectronProxy');
const proxyAuthStore = new ProxyAuthStore();

let activeProxyConfiguration: ProxyConfiguration = defaultProxyConfiguration();
let activeSessionProxyConfig: ProxyConfig | null = null;
const proxyConfigurationListeners = new Set<ProxyConfigurationListener>();
let appProxyLoginHandlerRegistered = false;

function readStartupProxyConfiguration(): ProxyConfiguration {
  try {
    return cloneProxyConfiguration(StartupOptionsManager.get().proxy);
  } catch {
    return defaultProxyConfiguration();
  }
}

function buildPacScriptUrl(config: ProxyConfiguration): string {
  const { port } = PostyBirbEnvConfig;
  return `https://127.0.0.1:${port}/api/proxy/pac/${config.pacAccessToken}`;
}

function redactPacUrl(config: ProxyConfiguration): string | undefined {
  if (config.mode !== 'pac_routing' || !config.pacAccessToken?.trim()) {
    return undefined;
  }

  return `https://127.0.0.1:${PostyBirbEnvConfig.port}/api/proxy/pac/[redacted]`;
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

      const proxyRules = buildSessionProxyRules(toEnabledProxyProfile(entry));
      if (!proxyRules) {
        return { mode: 'system' };
      }

      return {
        mode: 'fixed_servers',
        proxyRules,
        proxyBypassRules: buildChromiumProxyBypassRules(PostyBirbEnvConfig.port),
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
  trustPostyBirbLocalCertificate(targetSession);
  try {
    await targetSession.setProxy(config);
    targetSession.closeAllConnections();
    logger.withMetadata({ mode: config.mode }).debug('setProxy applied');
  } catch (error) {
    logger.withError(toError(error)).warn('setProxy failed');
    throw error;
  }
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

export function getProxyConfiguration(): ProxyConfiguration {
  return cloneProxyConfiguration(activeProxyConfiguration);
}

export function attachProxyAuthToRequest(request: ClientRequest): void {
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

async function refreshPartitionSessions(
  partitionIds: string[],
  proxyConfig: ProxyConfig,
): Promise<void> {
  await Promise.all(
    partitionIds.map(async (partitionId) => {
      const partition = session.fromPartition(`persist:${partitionId}`);
      await applyProxyConfigToSession(partition, proxyConfig);
    }),
  );
}

async function applyFullProxyConfig(
  resolvedConfiguration: ProxyConfiguration,
  partitionIds: string[],
): Promise<void> {
  const proxyConfig = resolveSessionProxyConfig(resolvedConfiguration);
  activeSessionProxyConfig = proxyConfig;

  logger
    .withMetadata({
      mode: resolvedConfiguration.mode,
      poolSize: resolvedConfiguration.pool.length,
      partitionCount: partitionIds.length,
      pacUrl: redactPacUrl(resolvedConfiguration),
    })
    .info('applyProxy');

  await applyProxyConfigToSession(session.defaultSession, proxyConfig);
  await applyAppLevelProxy(proxyConfig);
  await refreshPartitionSessions(partitionIds, proxyConfig);
}

function resolveActiveConfiguration(
  configuration?: ProxyConfiguration,
): ProxyConfiguration {
  if (configuration !== undefined) {
    return prepareProxyConfiguration(configuration);
  }

  return readStartupProxyConfiguration();
}

/**
 * Applies startup.json (or explicit) proxy config to defaultSession, app proxy,
 * and all listed account partitions.
 */
export async function applyProxy(
  configuration?: ProxyConfiguration,
  partitionIds: string[] = [],
): Promise<void> {
  ensureAppProxyLoginHandler();

  const resolvedConfiguration = resolveActiveConfiguration(configuration);
  proxyAuthStore.syncPool(toPoolAuthEntries(resolvedConfiguration.pool));
  activeProxyConfiguration = resolvedConfiguration;

  if (!app.isReady()) {
    return;
  }

  await applyFullProxyConfig(resolvedConfiguration, partitionIds);
  await notifyProxyConfigurationApplied();
}

export async function resolveProxyForUrl(url: string): Promise<string> {
  return session.defaultSession.resolveProxy(url);
}

export async function onSessionCreated(createdSession: Session): Promise<void> {
  if (!app.isReady()) {
    return;
  }

  const proxyConfig =
    activeSessionProxyConfig ??
    resolveSessionProxyConfig(activeProxyConfiguration);

  await applyProxyConfigToSession(createdSession, proxyConfig);
}

export function resetProxyStateForTests(): void {
  activeSessionProxyConfig = null;
  activeProxyConfiguration = defaultProxyConfiguration();
  proxyAuthStore.clear();
}

export function clearProxyAuthStore(): void {
  proxyAuthStore.clear();
}

/** @internal Exported for unit tests. */
export function __resolveSessionProxyConfigForTests(
  config: ProxyConfiguration,
): ProxyConfig {
  return resolveSessionProxyConfig(config);
}
