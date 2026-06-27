import type {
  ProxyConfiguration,
  ProxyMode,
  ProxyPoolEntry,
  ProxyProfile,
  ProxyType,
  ProxyValidationIssue,
  ValidateProxyConfigurationOptions,
  ValidateProxyConfigurationResult,
} from '@postybirb/types';

const PROXY_MODES: ProxyMode[] = [
  'system',
  'direct',
  'fixed_servers',
  'pac_routing',
];

function isProxyMode(value: unknown): value is ProxyMode {
  return typeof value === 'string' && PROXY_MODES.includes(value as ProxyMode);
}

export function defaultProxyConfiguration(): ProxyConfiguration {
  return {
    mode: 'system',
    pool: [],
    routing: {},
  };
}

export function isProxyConfiguration(
  value: unknown,
): value is ProxyConfiguration {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  if (Array.isArray((value as { profiles?: unknown }).profiles)) {
    return false;
  }

  const candidate = value as ProxyConfiguration;
  return (
    isProxyMode(candidate.mode) &&
    Array.isArray(candidate.pool) &&
    typeof candidate.routing === 'object' &&
    candidate.routing !== null
  );
}

export function normalizeProxyPoolEntry(
  entry?: Partial<ProxyPoolEntry>,
): ProxyPoolEntry {
  const type: ProxyType =
    entry?.type === 'socks5' || entry?.type === 'http' ? entry.type : 'http';

  return {
    id: entry?.id?.trim() ?? '',
    label: entry?.label?.trim() || undefined,
    type,
    host: entry?.host?.trim() ?? '',
    port: entry?.port?.trim() ?? '',
    username: type === 'socks5' ? '' : entry?.username?.trim() ?? '',
    password: type === 'socks5' ? '' : entry?.password ?? '',
  };
}

export function mergeProxyPoolPasswords(
  incoming: Partial<ProxyPoolEntry>[],
  saved: ProxyPoolEntry[],
): ProxyPoolEntry[] {
  return incoming.map((entry) => {
    const existing = saved.find((savedEntry) => savedEntry.id === entry.id);

    return normalizeProxyPoolEntry({
      ...entry,
      password: entry.password?.trim()
        ? entry.password
        : existing?.password ?? '',
    });
  });
}

function inferFixedProxyIdFromRouting(
  config: ProxyConfiguration,
): string | undefined {
  const poolIds = new Set(config.pool.map((entry) => entry.id));
  const usedPoolIds = new Set<string>();

  for (const choice of Object.values(config.routing)) {
    if (choice === 'direct' || choice === 'system') {
      continue;
    }

    if (poolIds.has(choice)) {
      usedPoolIds.add(choice);
    }
  }

  if (usedPoolIds.size === 1) {
    return [...usedPoolIds][0];
  }

  if (config.pool.length === 1 && config.pool[0]?.id) {
    return config.pool[0].id;
  }

  return undefined;
}

export function sanitizeProxyConfigurationForMode(
  config: ProxyConfiguration,
): ProxyConfiguration {
  switch (config.mode) {
    case 'fixed_servers': {
      const fixedProxyId =
        config.fixedProxyId?.trim() ||
        inferFixedProxyIdFromRouting(config);

      return {
        ...config,
        fixedProxyId,
        routing: {},
        pacAccessToken: undefined,
      };
    }
    case 'pac_routing':
      return {
        ...config,
        fixedProxyId: undefined,
      };
    case 'system':
    case 'direct':
      return {
        ...config,
        fixedProxyId: undefined,
        pacAccessToken: undefined,
      };
    default:
      return config;
  }
}

export function cloneProxyConfiguration(
  config: ProxyConfiguration,
): ProxyConfiguration {
  return {
    ...config,
    pool: config.pool.map((entry) => ({ ...entry })),
    routing: { ...config.routing },
  };
}

export function normalizeProxyConfiguration(
  config?: Partial<ProxyConfiguration>,
): ProxyConfiguration {
  return {
    mode: isProxyMode(config?.mode) ? config.mode : 'system',
    pool: Array.isArray(config?.pool)
      ? config.pool.map((entry) => normalizeProxyPoolEntry(entry))
      : [],
    fixedProxyId: config?.fixedProxyId?.trim() || undefined,
    routing:
      config?.routing && typeof config.routing === 'object'
        ? { ...config.routing }
        : {},
    pacAccessToken: config?.pacAccessToken?.trim() || undefined,
  };
}

export function prepareProxyConfiguration(
  config?: Partial<ProxyConfiguration>,
): ProxyConfiguration {
  return sanitizeProxyConfigurationForMode(normalizeProxyConfiguration(config));
}

function parsePoolPort(port: string): number | null {
  const parsed = Number.parseInt(port.trim(), 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    return null;
  }

  return parsed;
}

function formatPoolEntryName(entry: ProxyPoolEntry, index: number): string {
  const label = entry.label?.trim();
  if (label) {
    return label;
  }

  return `Proxy ${index + 1}`;
}

function formatWebsiteName(
  websiteId: string,
  options?: ValidateProxyConfigurationOptions,
): string {
  return options?.websiteDisplayNames?.[websiteId]?.trim() || websiteId;
}

function pushIssue(
  issues: ProxyValidationIssue[],
  issue: ProxyValidationIssue,
): void {
  issues.push(issue);
}

export function validateProxyConfiguration(
  config: ProxyConfiguration,
  options?: ValidateProxyConfigurationOptions,
): ValidateProxyConfigurationResult {
  const issues: ProxyValidationIssue[] = [];
  const poolIds = new Set<string>();

  config.pool.forEach((entry, index) => {
    const name = formatPoolEntryName(entry, index);

    if (!entry.id.trim()) {
      pushIssue(issues, {
        message: `${name}: Proxy entry is invalid.`,
        entryId: entry.id || undefined,
      });
    } else if (poolIds.has(entry.id)) {
      pushIssue(issues, {
        message: `${name}: Duplicate proxy entry.`,
        entryId: entry.id,
      });
    } else {
      poolIds.add(entry.id);
    }

    if (!entry.host.trim()) {
      pushIssue(issues, {
        message: `${name}: Host is required.`,
        field: 'host',
        entryId: entry.id,
      });
    }

    if (parsePoolPort(entry.port) === null) {
      pushIssue(issues, {
        message: `${name}: Port must be a number between 1 and 65535.`,
        field: 'port',
        entryId: entry.id,
      });
    }
  });

  if (config.mode === 'fixed_servers') {
    if (!config.fixedProxyId?.trim()) {
      pushIssue(issues, {
        message: 'Select a proxy for all traffic.',
        field: 'fixedProxyId',
      });
    } else if (!poolIds.has(config.fixedProxyId)) {
      pushIssue(issues, {
        message:
          'The selected proxy is no longer in the pool. Choose another one.',
        field: 'fixedProxyId',
      });
    }
  }

  if (config.mode === 'pac_routing') {
    Object.entries(config.routing).forEach(([websiteId, choice]) => {
      if (choice === 'direct' || choice === 'system') {
        return;
      }

      if (!poolIds.has(choice)) {
        const websiteName = formatWebsiteName(websiteId, options);
        pushIssue(issues, {
          message: `${websiteName}: Selected proxy is missing from the pool.`,
          field: 'routing',
          websiteId,
        });
      }
    });
  }

  return {
    ok: issues.length === 0,
    errors: issues.map((issue) => issue.message),
    issues,
  };
}

export type ShouldBypassProxyOptions = {
  remoteHost?: string;
  appPort?: string;
};

export function buildProxyRules(profile: ProxyProfile): string {
  if (!profile.enabled || !profile.host || !profile.port) {
    return '';
  }

  if (profile.type === 'socks5') {
    return `socks5://${profile.host}:${profile.port}`;
  }

  const auth =
    profile.username.length > 0
      ? `${encodeURIComponent(profile.username)}:${encodeURIComponent(
          profile.password,
        )}@`
      : '';

  return `${profile.type}://${auth}${profile.host}:${profile.port}`;
}

/**
 * Proxy rules for Electron `session.setProxy`. Chromium webviews ignore
 * credentials embedded in proxyRules; auth is supplied via app `login`.
 */
export function buildSessionProxyRules(profile: ProxyProfile): string {
  if (!profile.enabled || !profile.host || !profile.port) {
    return '';
  }

  if (profile.type === 'socks5') {
    return `socks5://${profile.host}:${profile.port}`;
  }

  return `http=${profile.host}:${profile.port};https=${profile.host}:${profile.port}`;
}

export function toEnabledProxyProfile(entry: ProxyPoolEntry): ProxyProfile {
  return {
    ...entry,
    enabled: true,
  };
}

export function buildProxyAgentUrl(
  profile?: ProxyProfile | null,
): string | null {
  if (!profile) {
    return null;
  }

  const rules = buildProxyRules(profile);
  return rules.length > 0 ? rules : null;
}

function parseRemoteHostInput(remoteHost: string): string | null {
  const trimmed = remoteHost.trim();
  if (!trimmed) {
    return null;
  }

  try {
    if (trimmed.includes('://')) {
      return new URL(trimmed).hostname.toLowerCase();
    }
  } catch {
    // Fall through to host:port parsing.
  }

  return trimmed.split(':')[0]?.toLowerCase() ?? null;
}

function resolveUrlPort(url: URL): string {
  if (url.port) {
    return url.port;
  }

  if (url.protocol === 'https:') {
    return '443';
  }

  if (url.protocol === 'http:') {
    return '80';
  }

  return '';
}

const DEFAULT_CLOUD_API_URL = 'https://postybirb.azurewebsites.net/api';

export function resolveCloudApiUrl(): string {
  return process.env.POSTYBIRB_CLOUD_URL || DEFAULT_CLOUD_API_URL;
}

export function escapePacScriptString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/** PAC `FindProxyForURL` return token for a pool entry (no surrounding quotes). */
export function buildPacProxyDirective(entry: ProxyPoolEntry): string {
  const host = entry.host?.trim() ?? '';
  const port = entry.port?.trim() ?? '';
  if (!host || !port) {
    return 'DIRECT';
  }

  const hostPort = `${escapePacScriptString(host)}:${escapePacScriptString(port)}`;
  if (entry.type === 'socks5') {
    return `SOCKS5 ${hostPort}`;
  }

  return `PROXY ${hostPort}`;
}

/** Nest route and loopback PAC server path (no trailing slash). */
export const PAC_SCRIPT_API_PATH = '/api/proxy/pac';

export const PAC_SCRIPT_MEDIA_TYPE = 'application/x-ns-proxy-autoconfig';

export const PAC_SCRIPT_CACHE_CONTROL = 'no-store';

/** Loopback HTTP port for Chromium PAC fetches (defaults to main API port + 1). */
export function resolvePacHttpPort(appPort: string): string {
  const override = process.env.POSTYBIRB_PAC_PORT?.trim();
  if (override) {
    return override;
  }

  const parsed = parseInt(appPort, 10);
  if (Number.isNaN(parsed)) {
    return appPort;
  }

  return String(parsed + 1);
}

export function buildPacScriptUrl(
  config: Pick<ProxyConfiguration, 'mode' | 'pacAccessToken'>,
  appPort: string,
): string | null {
  if (config.mode !== 'pac_routing' || !config.pacAccessToken?.trim()) {
    return null;
  }

  const pacPort = resolvePacHttpPort(appPort);
  return `http://127.0.0.1:${pacPort}${PAC_SCRIPT_API_PATH}/${config.pacAccessToken}`;
}

export function parsePacScriptTokenFromUrl(url: string): string | null {
  const path = url.split(/[?#]/, 1)[0] ?? '';
  const prefix = `${PAC_SCRIPT_API_PATH}/`;
  if (!path.startsWith(prefix)) {
    return null;
  }

  const token = decodeURIComponent(path.slice(prefix.length)).trim();
  return token || null;
}

export function buildChromiumProxyBypassRules(
  appPort?: string | number,
): string {
  const rules = ['<-loopback>', 'localhost', '127.0.0.1', '[::1]'];
  const port = appPort?.toString().trim();

  if (port) {
    rules.push(`localhost:${port}`, `127.0.0.1:${port}`);
    const pacPort = resolvePacHttpPort(port);
    rules.push(`localhost:${pacPort}`, `127.0.0.1:${pacPort}`);
  }

  try {
    const host = new URL(resolveCloudApiUrl()).hostname.toLowerCase();
    if (host) {
      rules.push(host);
    }
  } catch {
    // Ignore invalid cloud URL configuration.
  }

  return rules.join(';');
}

export function shouldBypassProxyForUrl(
  rawUrl: string,
  options?: ShouldBypassProxyOptions,
): boolean {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.toLowerCase();

    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
      return true;
    }

    const appPort = options?.appPort?.trim();
    if (
      appPort &&
      (host === 'localhost' || host === '127.0.0.1' || host === '::1') &&
      resolveUrlPort(url) === appPort
    ) {
      return true;
    }

    const remoteHost = options?.remoteHost
      ? parseRemoteHostInput(options.remoteHost)
      : null;
    if (remoteHost && host === remoteHost) {
      return true;
    }

    const cloudApiUrl = resolveCloudApiUrl();
    try {
      const cloudHost = new URL(cloudApiUrl).hostname.toLowerCase();
      if (cloudHost && host === cloudHost) {
        return true;
      }
    } catch {
      // Ignore invalid cloud URL configuration.
    }
  } catch {
    // If URL cannot be parsed we should not bypass proxy automatically.
  }

  return false;
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
