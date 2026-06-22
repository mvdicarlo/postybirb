import { Logger } from '@postybirb/logger';
import { ProxyType } from '@postybirb/types';

export type ProxyCredentials = {
  username: string;
  password: string;
};

export type ProxyPoolAuthEntry = {
  id: string;
  type: ProxyType;
  host: string;
  port: string;
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

function toCredentials(entry: {
  username: string;
  password: string;
}): ProxyCredentials {
  return {
    username: entry.username.trim(),
    password: entry.password ?? '',
  };
}

/**
 * Stores HTTP proxy auth credentials keyed by pool endpoint (type:host:port) and
 * resolves them for Chromium `app.on('login')` and ClientRequest login events.
 * SOCKS5 entries are host+port only and are not registered here.
 */
export class ProxyAuthStore {
  private readonly poolCredentials = new Map<string, ProxyCredentials>();

  syncPool(entries: ProxyPoolAuthEntry[]): void {
    this.poolCredentials.clear();

    for (const entry of entries) {
      this.upsertPoolEntry(entry);
    }

    logger
      .withMetadata({ poolSize: this.poolCredentials.size })
      .info('syncPool');
  }

  resolveForProxyChallenge(
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

    const portKey = String(port);
    const credentials = this.poolCredentials.get(
      buildPoolKey('http', host, portKey),
    );
    if (credentials) {
      logger.withMetadata({ type: 'http', host, port: portKey }).debug('login');
      return credentials;
    }

    logger
      .withMetadata({ host, port: portKey, scheme: authInfo.scheme ?? null })
      .warn('no matching pool credentials for proxy challenge');
    return null;
  }

  clear(): void {
    this.poolCredentials.clear();
  }

  private upsertPoolEntry(entry: ProxyPoolAuthEntry): void {
    if (entry.type === 'socks5') {
      return;
    }

    if (!entry.host?.trim() || !entry.port?.trim()) {
      return;
    }

    if (!hasAuthCredentials(entry.username, entry.password)) {
      return;
    }

    const key = buildPoolKey(entry.type, entry.host, entry.port);
    this.poolCredentials.set(key, toCredentials(entry));
  }
}
