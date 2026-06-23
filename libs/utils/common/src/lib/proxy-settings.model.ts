export type {
  ProxyConfiguration,
  ProxyMode,
  ProxyPoolEntry,
  ProxyProfile,
  ProxyType,
  ValidateProxyConfigurationResult,
  WebsiteProxyChoice,
} from '@postybirb/types';

export {
  cloneProxyConfiguration,
  defaultProxyConfiguration,
  isProxyConfiguration,
  mergeProxyPoolPasswords,
  normalizeProxyConfiguration,
  normalizeProxyPoolEntry,
  prepareProxyConfiguration,
  sanitizeProxyConfigurationForMode,
  validateProxyConfiguration,
} from '@postybirb/types';

import type {
  ProxyConfiguration,
  ProxyPoolEntry,
  ProxyProfile,
} from '@postybirb/types';
import {
  isProxyConfiguration,
  normalizeProxyPoolEntry,
} from '@postybirb/types';

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

export function buildPacScriptUrl(
  config: Pick<ProxyConfiguration, 'mode' | 'pacAccessToken'>,
  appPort: string,
): string | null {
  if (config.mode !== 'pac_routing' || !config.pacAccessToken?.trim()) {
    return null;
  }

  return `https://127.0.0.1:${appPort}/api/proxy/pac/${config.pacAccessToken}`;
}

export function buildChromiumProxyBypassRules(
  appPort?: string | number,
): string {
  const rules = ['<-loopback>', 'localhost', '127.0.0.1', '[::1]'];
  const port = appPort?.toString().trim();

  if (port) {
    rules.push(`localhost:${port}`, `127.0.0.1:${port}`);
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
