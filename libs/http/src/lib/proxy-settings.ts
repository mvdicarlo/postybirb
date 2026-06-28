import type { ProxyConfiguration, ProxyPoolEntry } from '@postybirb/types';
import { resolveCloudApiUrl } from '@postybirb/utils/common';

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

export type ShouldBypassProxyOptions = {
  remoteHost?: string;
  appPort?: string;
};

export function escapePacScriptString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export const PAC_SCRIPT_API_PATH = '/api/proxy/pac';
export const PAC_SCRIPT_MEDIA_TYPE = 'application/x-ns-proxy-autoconfig';
export const PAC_SCRIPT_CACHE_CONTROL = 'no-store';

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
