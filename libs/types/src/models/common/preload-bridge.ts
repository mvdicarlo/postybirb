import type { RemoteConfig } from '@postybirb/utils/common';

export interface PreloadBridge {
  getLanIp(): Promise<string | undefined>;
  getRemoteConfig(): RemoteConfig;
  pickDirectory?(defaultPath?: string): Promise<string | undefined>;
  openExternalLink(url: string): void;
  getCookiesForAccount(accountId: string): Promise<string>;
  getLocalStorageForAccount(
    accountId: string,
    url: string,
  ): Promise<Record<string, unknown>>;
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
