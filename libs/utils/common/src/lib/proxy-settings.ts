export type ProxyType = 'http' | 'socks5';

export type ProxyProfile = {
  id: string;
  enabled: boolean;
  label?: string;
  type: ProxyType;
  host: string;
  port: string;
  username: string;
  password: string;
  websites: string[];
};

export type ProxyConfiguration = {
  profiles: ProxyProfile[];
};

export const DEFAULT_PROXY_CONFIGURATION: ProxyConfiguration = {
  profiles: [],
};

export type ShouldBypassProxyOptions = {
  remoteHost?: string;
  appPort?: string;
};

const PROXY_LOG_LEVEL = (process.env.LOG_LEVEL ?? 'debug').toLowerCase();

function proxyDebug(message: string, context?: Record<string, unknown>): void {
  if (PROXY_LOG_LEVEL === 'error' || PROXY_LOG_LEVEL === 'warn') {
    return;
  }

  if (context) {
    // eslint-disable-next-line no-console
    console.debug(message, context);
    return;
  }

  // eslint-disable-next-line no-console
  console.debug(message);
}

export function isProxyConfiguration(value: unknown): value is ProxyConfiguration {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as ProxyConfiguration;
  return Array.isArray(candidate.profiles);
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

export function buildProxyRules(input?: Partial<ProxyProfile>): string {
  const profile = normalizeProxyProfile(input);
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

export function buildProxyAgentUrl(
  input?: Partial<ProxyProfile>,
): string | null {
  const rules = buildProxyRules(input);
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

export function shouldBypassProxyForUrl(
  rawUrl: string,
  options?: ShouldBypassProxyOptions,
): boolean {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.toLowerCase();

    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
      proxyDebug('[ProxySettings.bypass]', { rawUrl, reason: 'loopback', host });
      return true;
    }

    const appPort = options?.appPort?.trim();
    if (
      appPort &&
      (host === 'localhost' || host === '127.0.0.1' || host === '::1') &&
      resolveUrlPort(url) === appPort
    ) {
      proxyDebug('[ProxySettings.bypass]', {
        rawUrl,
        reason: 'app-port',
        host,
        appPort,
      });
      return true;
    }

    const remoteHost = options?.remoteHost
      ? parseRemoteHostInput(options.remoteHost)
      : null;
    if (remoteHost && host === remoteHost) {
      proxyDebug('[ProxySettings.bypass]', {
        rawUrl,
        reason: 'remote-host',
        host,
        remoteHost,
      });
      return true;
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
