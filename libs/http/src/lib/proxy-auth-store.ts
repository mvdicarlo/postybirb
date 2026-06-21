import { Logger } from '@postybirb/logger';
import { ProxyProfile, ProxyType } from '@postybirb/utils/common';

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
 * Stores proxy auth credentials keyed by pool endpoint (type:host:port) and
 * resolves them for Chromium `app.on('login')` and ClientRequest login events.
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

  /**
   * Registers credentials from a profile during partition apply (v2 bridge).
   * Pool entries are only removed via {@link clear} or {@link syncPool}.
   */
  syncPartitionProfile(_partitionId: string, profile: ProxyProfile | null): void {
    if (!profile?.enabled || !hasAuthCredentials(profile.username, profile.password)) {
      return;
    }

    this.upsertFromProfile(profile);
  }

  resolveForProxyChallenge(
    authInfo: ProxyChallengeInfo,
  ): ProxyCredentials | null {
    if (!authInfo.isProxy) {
      return null;
    }

    const host = authInfo.host?.trim();
    const port = authInfo.port;
    if (!host || !port) {
      logger
        .withMetadata({ host: authInfo.host, port: authInfo.port })
        .warn('proxy challenge missing host or port');
      return null;
    }

    const portKey = String(port);
    for (const type of ['http', 'socks5'] as const) {
      const credentials = this.poolCredentials.get(
        buildPoolKey(type, host, portKey),
      );
      if (credentials) {
        logger
          .withMetadata({ type, host, port: portKey })
          .debug('login');
        return credentials;
      }
    }

    logger
      .withMetadata({ host, port: portKey, scheme: authInfo.scheme ?? null })
      .warn('no matching pool credentials for proxy challenge');
    return null;
  }

  clear(): void {
    this.poolCredentials.clear();
  }

  private upsertFromProfile(profile: ProxyProfile): void {
    this.upsertPoolEntry({
      id: profile.id,
      type: profile.type,
      host: profile.host,
      port: profile.port,
      username: profile.username,
      password: profile.password,
    });
  }

  private upsertPoolEntry(entry: ProxyPoolAuthEntry): void {
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
