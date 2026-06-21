export type ProxyType = 'http' | 'socks5';

export type ProxyMode = 'system' | 'direct' | 'fixed_servers' | 'pac_routing';

export type ProxyPoolEntry = {
  id: string;
  label?: string;
  type: ProxyType;
  host: string;
  port: string;
  username: string;
  password: string;
};

export type WebsiteProxyChoice = 'direct' | 'system' | string;

export type ProxyConfiguration = {
  mode: ProxyMode;
  pool: ProxyPoolEntry[];
  fixedProxyId?: string;
  routing: Record<string, WebsiteProxyChoice>;
  pacAccessToken?: string;
};

/** @deprecated v2 partition routing — removed in global-proxy-manager */
export type LegacyProxyConfiguration = {
  profiles: ProxyProfile[];
};

export type ProxyProfile = ProxyPoolEntry & {
  enabled: boolean;
  websites: string[];
};

export type ShouldBypassProxyOptions = {
  remoteHost?: string;
  appPort?: string;
};

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

export function isLegacyProxyConfiguration(
  value: unknown,
): value is LegacyProxyConfiguration {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  return Array.isArray((value as LegacyProxyConfiguration).profiles);
}

export function isProxyConfiguration(value: unknown): value is ProxyConfiguration {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  if (isLegacyProxyConfiguration(value)) {
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
    username: entry?.username?.trim() ?? '',
    password: entry?.password ?? '',
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

export type ValidateProxyConfigurationResult = {
  ok: boolean;
  errors: string[];
};

function parsePoolPort(port: string): number | null {
  const parsed = Number.parseInt(port.trim(), 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    return null;
  }

  return parsed;
}

export function validateProxyConfiguration(
  config: ProxyConfiguration,
): ValidateProxyConfigurationResult {
  const errors: string[] = [];
  const poolIds = new Set<string>();

  config.pool.forEach((entry, index) => {
    const label = entry.label || entry.id || `pool-${index + 1}`;

    if (!entry.id.trim()) {
      errors.push(`Pool entry "${label}" requires an id.`);
    } else if (poolIds.has(entry.id)) {
      errors.push(`Duplicate pool id "${entry.id}".`);
    } else {
      poolIds.add(entry.id);
    }

    if (!entry.host.trim()) {
      errors.push(`Pool entry "${label}" requires host.`);
    }

    if (parsePoolPort(entry.port) === null) {
      errors.push(
        `Pool entry "${label}" requires port between 1 and 65535.`,
      );
    }
  });

  if (config.mode === 'fixed_servers') {
    if (!config.fixedProxyId?.trim()) {
      errors.push('fixed_servers mode requires fixedProxyId.');
    } else if (!poolIds.has(config.fixedProxyId)) {
      errors.push(
        `fixedProxyId "${config.fixedProxyId}" does not match a pool entry.`,
      );
    }
  }

  Object.entries(config.routing).forEach(([websiteId, choice]) => {
    if (choice === 'direct' || choice === 'system') {
      return;
    }

    if (!poolIds.has(choice)) {
      errors.push(
        `Website "${websiteId}" routes to unknown pool id "${choice}".`,
      );
    }
  });

  return {
    ok: errors.length === 0,
    errors,
  };
}

export function normalizeProxyProfile(
  profile?: Partial<ProxyProfile>,
): ProxyProfile {
  const type: ProxyType =
    profile?.type === 'socks5' || profile?.type === 'http'
      ? profile.type
      : 'http';

  return {
    id: profile?.id?.trim() ?? '',
    enabled: profile?.enabled ?? false,
    label: profile?.label?.trim() || undefined,
    type,
    host: profile?.host?.trim() ?? '',
    port: profile?.port?.trim() ?? '',
    username: profile?.username?.trim() ?? '',
    password: profile?.password ?? '',
    websites: Array.isArray(profile?.websites) ? [...profile.websites] : [],
  };
}

export function buildProxyRules(profile: ProxyProfile): string {
  if (!profile.enabled || !profile.host || !profile.port) {
    return '';
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

export function asEnabledProxyProfile(entry: ProxyPoolEntry): ProxyProfile {
  return {
    ...entry,
    enabled: true,
    websites: [],
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

export function buildChromiumProxyBypassRules(
  cloudApiUrl = process.env.POSTYBIRB_CLOUD_URL ||
    'https://postybirb.azurewebsites.net/api',
): string {
  const rules = ['<-loopback>'];

  try {
    const host = new URL(cloudApiUrl).hostname.toLowerCase();
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

    const cloudApiUrl =
      process.env.POSTYBIRB_CLOUD_URL ||
      'https://postybirb.azurewebsites.net/api';
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
