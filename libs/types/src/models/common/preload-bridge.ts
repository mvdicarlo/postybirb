import type { RemoteConfig } from '@postybirb/utils/common';

export interface PreloadBridge {
  getLanIp(): Promise<string | undefined>;
  getRemoteConfig(): RemoteConfig;
  pickDirectory?(defaultPath?: string): Promise<string | undefined>;
  openExternalLink(url: string): void;
  getCookiesForAccount(accountId: string): Promise<string>;
  applyProxyConfig(): Promise<void>;
  /** Subscribe to proxy re-applies after settings save (returns unsubscribe). */
  onProxyConfigApplied(callback: () => void): () => void;
  /** @deprecated Use applyProxyConfig() — global config applies to all partitions */
  ensurePartitionProxy(accountId: string): Promise<void>;
  quit(code?: number): void;
  platform: NodeJS.Platform;
  app_port: string;
  app_version: string;

  setSpellCheckerEnabled(value: boolean): void;
  setSpellcheckerLanguages: (languages: string[]) => Promise<void>;
  getSpellcheckerLanguages: () => Promise<string[]>;
  getAllSpellcheckerLanguages: () => Promise<string[]>;
  getSpellcheckerWords: () => Promise<string[]>;
  setSpellcheckerWords: (words: string[]) => Promise<void>;
}
