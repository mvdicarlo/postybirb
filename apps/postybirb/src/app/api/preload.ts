import type { PreloadBridge } from '@postybirb/types';
import type { RemoteConfig } from '@postybirb/utils/common';
import { contextBridge, ipcRenderer, webUtils } from 'electron';
import { type AppMetadata, IPC_CHANNELS } from '../constants';

// Implementation at electron.events.ts, typings for ui at main.tsx.
//
// This preload runs sandboxed, so it cannot read process.env. App metadata
// (port, version, platform) is fetched synchronously over IPC at load time so
// the exposed bridge can keep the same synchronous shape the UI relies on.

const metadata: AppMetadata = (ipcRenderer.sendSync(
  IPC_CHANNELS.getAppMetadata,
) as AppMetadata | null) ?? {
  platform: process.platform,
  app_port: '',
  app_version: '',
};

const droppedFilePaths = new Map<string, string[]>();

function getFileIdentity(file: Pick<File, 'name' | 'size' | 'lastModified'>) {
  return `${file.name}\0${file.size}\0${file.lastModified}`;
}

type NativeDropEvent = {
  dataTransfer?: {
    files: ArrayLike<File>;
  };
};

const preloadGlobal = globalThis as typeof globalThis & {
  addEventListener(
    type: 'drop',
    listener: (event: NativeDropEvent) => void,
    options?: boolean,
  ): void;
};

preloadGlobal.addEventListener(
  'drop',
  (event) => {
    const files = event.dataTransfer?.files;
    if (!files?.length) return;

    droppedFilePaths.clear();
    for (const file of Array.from(files)) {
      const filePath = webUtils.getPathForFile(file);
      if (!filePath) continue;

      const identity = getFileIdentity(file);
      const paths = droppedFilePaths.get(identity) ?? [];
      paths.push(filePath);
      droppedFilePaths.set(identity, paths);
    }
  },
  true,
);

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
  getLocalStorageForAccount: (accountId: string, url: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.getLocalStorageForAccount, accountId, url),
  readSidecarOptions: (file: File) => {
    const diskPath = webUtils.getPathForFile(file);
    const identity = getFileIdentity(file);
    const paths = droppedFilePaths.get(identity);
    const filePath = diskPath || paths?.shift() || '';
    if (paths?.length === 0) {
      droppedFilePaths.delete(identity);
    }
    return ipcRenderer.invoke(IPC_CHANNELS.readSidecarOptions, filePath);
  },

  // Gracefully request app quit from renderer.
  quit: (code?: number) => ipcRenderer.send(IPC_CHANNELS.quit, code),
  platform: metadata.platform,
  app_port: metadata.app_port,
  app_version: metadata.app_version,
  telemetry_installation_id: metadata.telemetry_installation_id,
  systemLocale: metadata.systemLocale,

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
