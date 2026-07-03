import { Logger } from '@postybirb/logger';
import { type ProxyPoolEntry, ProxyType } from '@postybirb/types';

export type ProxyCredentials = {
  username: string;
  password: string;
};

export type ProxyChallengeInfo = {
  isProxy: boolean;
  host: string;
  port: number;
  scheme?: string;
};

const logger = Logger('ProxyAuth');
const poolCredentials = new Map<string, ProxyCredentials>();

export function buildPoolKey(
  type: ProxyType,
  host: string,
  port: string | number,
): string {
  return `${type}:${host.trim().toLowerCase()}:${String(port).trim()}`;
}

function hasAuthCredentials(username: string, password: string): boolean {
  return username.trim().length > 0;
}

export function syncProxyAuthPool(entries: ProxyPoolEntry[]): void {
  poolCredentials.clear();

  for (const entry of entries) {
    if (entry.type === 'socks5') {
      continue;
    }

    if (!entry.host?.trim() || !entry.port?.trim()) {
      continue;
    }

    if (!hasAuthCredentials(entry.username, entry.password)) {
      continue;
    }

    poolCredentials.set(buildPoolKey(entry.type, entry.host, entry.port), {
      username: entry.username.trim(),
      password: entry.password ?? '',
    });
  }

  logger.withMetadata({ poolSize: poolCredentials.size }).info('syncPool');
}

export function resolveProxyAuthCredentials(
  authInfo: ProxyChallengeInfo,
): ProxyCredentials | null {
  if (!authInfo.isProxy) {
    return null;
  }

  const host = authInfo.host?.trim();
  const { port } = authInfo;
  if (!host || !port) {
    logger
      .withMetadata({ host: authInfo.host, port: authInfo.port })
      .warn('proxy challenge missing host or port');
    return null;
  }

  return poolCredentials.get(buildPoolKey('http', host, String(port))) ?? null;
}

export function clearProxyAuthStore(): void {
  poolCredentials.clear();
}
