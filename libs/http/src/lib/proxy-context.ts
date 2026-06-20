import { AsyncLocalStorage } from 'node:async_hooks';

export type ProxyContext = {
  websiteId?: string;
  accountId?: string;
};

const PROXY_LOG_LEVEL = (process.env.LOG_LEVEL ?? 'debug').toLowerCase();

const storage = new AsyncLocalStorage<ProxyContext>();

function proxyContextDebug(
  message: string,
  context?: Record<string, unknown>,
): void {
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

export function runWithProxyContext<T>(
  context: ProxyContext,
  fn: () => T,
): T {
  proxyContextDebug('[ProxyContext] enter', context);
  return storage.run(context, fn);
}

export function runWithProxyContextAsync<T>(
  context: ProxyContext,
  fn: () => Promise<T>,
): Promise<T> {
  proxyContextDebug('[ProxyContext] enter', context);
  return storage.run(context, fn);
}

export function getProxyContext(): ProxyContext {
  return storage.getStore() ?? {};
}

export function getEphemeralProxyPartitionId(websiteId: string): string {
  return `proxy-context-${websiteId}`;
}
