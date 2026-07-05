import type { ProxyConfiguration } from '@postybirb/types';

export type PlatformProxyConfig = {
  mode?: string;
  proxyRules?: string;
  proxyBypassRules?: string;
  pacScript?: string;
};

export type PlatformProxySession = {
  setProxy(proxyConfig: PlatformProxyConfig): Promise<void>;
  closeAllConnections(): void;
  forceReloadProxyConfig?: () => Promise<void>;
};

export abstract class PlatformProxyService {
  abstract applyProxy(
    partitionIds: string[],
    configuration?: ProxyConfiguration,
  ): Promise<void>;

  abstract onSessionCreated(
    createdSession: PlatformProxySession,
  ): Promise<void>;
}
