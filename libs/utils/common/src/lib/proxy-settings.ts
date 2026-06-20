import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';

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

  // Chromium PAC-style rules for HTTP CONNECT proxies in webviews.
  return `http=${profile.host}:${profile.port};https=${profile.host}:${profile.port}`;
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

export type ProxyHttpAgent =
  | SocksProxyAgent
  | HttpProxyAgent<string>
  | HttpsProxyAgent<string>;

export function createProxyAgent(
  profile: ProxyProfile,
  secure: boolean,
): ProxyHttpAgent | null {
  const agentUrl = buildProxyAgentUrl(profile);
  if (!agentUrl) {
    return null;
  }

  if (profile.type === 'socks5') {
    return new SocksProxyAgent(agentUrl);
  }

  return secure
    ? new HttpsProxyAgent(agentUrl)
    : new HttpProxyAgent(agentUrl);
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
