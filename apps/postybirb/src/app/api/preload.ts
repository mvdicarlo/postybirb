import type { PreloadBridge } from '@postybirb/types';
import type { RemoteConfig } from '@postybirb/utils/common';
import { contextBridge, ipcRenderer } from 'electron';
import { type AppMetadata, IPC_CHANNELS } from '../constants';

// Implementation at electron.events.ts, typings for ui at main.tsx.
//
// This preload runs sandboxed, so it cannot read process.env. App metadata
// (port, version, platform) is fetched synchronously over IPC at load time so
// the exposed bridge can keep the same synchronous shape the UI relies on.

let proxyConfigApplied = false;
const proxyConfigAppliedListeners = new Set<() => void>();

ipcRenderer.on('proxy-config-applied', () => {
  proxyConfigApplied = true;
  for (const listener of proxyConfigAppliedListeners) {
    listener();
  }
});

const metadata: AppMetadata = (ipcRenderer.sendSync(
  IPC_CHANNELS.getAppMetadata,
) as AppMetadata | null) ?? {
  platform: process.platform,
  app_port: '',
  app_version: '',
};

const bridge: PreloadBridge = {
  pickDirectory: (defaultPath) =>
    ipcRenderer.invoke(IPC_CHANNELS.pickDirectory, defaultPath),
  openExternalLink: (url: string) => {
    // Prevent app crash from trying to open undefined link.
    if (!url) {
      throw new TypeError(`openExternalLink: url cannot be empty! Got: ${url}`);
    }

    ipcRenderer.send(IPC_CHANNELS.openExternalLink, url);
  },
  getLanIp: () => ipcRenderer.invoke(IPC_CHANNELS.getLanIp),
  getRemoteConfig: (): RemoteConfig =>
    (ipcRenderer.sendSync(IPC_CHANNELS.getRemoteConfig) as RemoteConfig | null) ?? {
      enabled: false,
      password: '',
    },
  getCookiesForAccount: (accountId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.getCookiesForAccount, accountId),
  onProxyConfigApplied: (callback: () => void) => {
    if (proxyConfigApplied) {
      callback();
    } else {
      proxyConfigAppliedListeners.add(callback);
    }

    return () => {
      proxyConfigAppliedListeners.delete(callback);
    };
  },
  getLocalStorageForAccount: (accountId: string, url: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.getLocalStorageForAccount, accountId, url),

  // Gracefully request app quit from renderer.
  quit: (code?: number) => ipcRenderer.send(IPC_CHANNELS.quit, code),
  platform: metadata.platform,
  app_port: metadata.app_port,
  app_version: metadata.app_version,

  setSpellCheckerEnabled: (value: boolean) =>
    ipcRenderer.invoke(IPC_CHANNELS.setSpellcheckerEnabled, value),
  setSpellcheckerLanguages: (languages: string[]) =>
    ipcRenderer.invoke(IPC_CHANNELS.setSpellcheckerLanguages, languages),
  getSpellcheckerLanguages: () =>
    ipcRenderer.invoke(IPC_CHANNELS.getSpellcheckerLanguages) as Promise<
      string[]
    >,

  getAllSpellcheckerLanguages: () =>
    ipcRenderer.invoke(IPC_CHANNELS.getAllSpellcheckerLanguages) as Promise<
      string[]
    >,

  getSpellcheckerWords: () =>
    ipcRenderer.invoke(IPC_CHANNELS.getSpellcheckerWords) as Promise<string[]>,
  setSpellcheckerWords: (words: string[]) =>
    ipcRenderer.invoke(IPC_CHANNELS.setSpellcheckerWords, words),
};

contextBridge.exposeInMainWorld('electron', bridge);
