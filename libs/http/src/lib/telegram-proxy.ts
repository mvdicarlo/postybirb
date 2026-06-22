import { Logger } from '@postybirb/logger';
import type { ProxyConfiguration, ProxyPoolEntry } from '@postybirb/types';
import { isProxiedResolution } from '@postybirb/utils/common';
import { getProxyConfiguration, resolveProxyForUrl } from './electron-proxy';
import { parseProxyResolution } from './proxy-resolution';

const TELEGRAM_WEBSITE_ID = 'telegram';

export type TelegramSocksProxySettings = {
  ip: string;
  port: number;
  socksType: 5;
  username?: string;
  password?: string;
};

const logger = Logger('TelegramProxy');

async function resolveSystemSocksProxy(): Promise<
  TelegramSocksProxySettings | undefined
> {
  const resolutions = await Promise.all([
    resolveProxyForUrl('https://telegram.org'),
    resolveProxyForUrl('https://t.me/'),
  ]);

  const proxies = resolutions
    .filter(isProxiedResolution)
    .flatMap((resolution) => parseProxyResolution(resolution));

  const proxy = proxies.find(
    (entry) => entry.type === 'SOCKS' || entry.type === 'SOCKS5',
  );

  if (!proxy) {
    return undefined;
  }

  const port = Number.parseInt(proxy.port, 10);
  if (!proxy.hostname || Number.isNaN(port)) {
    return undefined;
  }

  return {
    ip: proxy.hostname,
    port,
    socksType: 5,
  };
}

function poolEntryToSocks(
  entry: ProxyPoolEntry,
): TelegramSocksProxySettings | undefined {
  if (entry.type !== 'socks5') {
    return undefined;
  }

  const port = Number.parseInt(entry.port, 10);
  if (!entry.host.trim() || Number.isNaN(port)) {
    return undefined;
  }

  return {
    ip: entry.host.trim(),
    port,
    socksType: 5,
    ...(entry.username ? { username: entry.username } : {}),
    ...(entry.password ? { password: entry.password } : {}),
  };
}

function warnHttpPoolEntry(entry: ProxyPoolEntry, context: string): void {
  logger.warn(
    `[Telegram.proxy] HTTP CONNECT pool entry "${entry.label || entry.id}" cannot be used for Teleproto (${context}); use SOCKS5, system SOCKS, or direct routing`,
  );
}

function resolveConfiguredPoolEntry(
  config: ProxyConfiguration,
  entry: ProxyPoolEntry | undefined,
): TelegramSocksProxySettings | undefined {
  if (!entry) {
    return undefined;
  }

  if (entry.type === 'http') {
    warnHttpPoolEntry(entry, config.mode);
    return undefined;
  }

  return poolEntryToSocks(entry);
}

/**
 * Resolves SOCKS5 settings for Teleproto from the global proxy configuration.
 * HTTP CONNECT pool entries are ignored with a warning.
 */
export async function resolveTelegramSocksProxy(
  config?: ProxyConfiguration,
): Promise<TelegramSocksProxySettings | undefined> {
  const proxyConfig = config ?? getProxyConfiguration();

  switch (proxyConfig.mode) {
    case 'direct':
      return undefined;
    case 'fixed_servers': {
      const entry = proxyConfig.pool.find(
        (poolEntry) => poolEntry.id === proxyConfig.fixedProxyId,
      );
      const socks = resolveConfiguredPoolEntry(proxyConfig, entry);
      return socks ?? resolveSystemSocksProxy();
    }
    case 'pac_routing': {
      const choice = proxyConfig.routing[TELEGRAM_WEBSITE_ID] ?? 'system';
      if (choice === 'direct') {
        return undefined;
      }
      if (choice === 'system') {
        return resolveSystemSocksProxy();
      }

      const entry = proxyConfig.pool.find((poolEntry) => poolEntry.id === choice);
      const socks = resolveConfiguredPoolEntry(proxyConfig, entry);
      return socks ?? resolveSystemSocksProxy();
    }
    case 'system':
    default:
      return resolveSystemSocksProxy();
  }
}
