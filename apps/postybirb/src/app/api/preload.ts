import { contextBridge, ipcRenderer } from 'electron';

// Implementation at electron.events.ts, typings for ui at main.tsx

contextBridge.exposeInMainWorld('electron', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  pickDirectory: () => ipcRenderer.invoke('pick-directory'),
  openExternalLink: (url: string) => {
    // Prevent app crash from trying to open undefined link
    if (!url) {
      throw new TypeError(`openExternalLink: url cannot be empty! Got: ${url}`);
    }

    ipcRenderer.send('open-external-link', url);
  },
  getLanIp: () => ipcRenderer.invoke('get-lan-ip'),
  getRemoteConfig: () => JSON.parse(process.env.remote || '{}'),
  getCookiesForAccount: (accountId: string) =>
    ipcRenderer.invoke('get-cookies-for-account', accountId),
  // Gracefully request app quit from renderer
  quit: (code?: number) => ipcRenderer.send('quit', code),
  platform: process.platform,
  app_port: process.env.POSTYBIRB_PORT,
  app_version: process.env.POSTYBIRB_VERSION,

  setSpellCheckerEnabled: (value: boolean) =>
    ipcRenderer.invoke('set-spellchecker-enabled', value),
  setSpellcheckerLanguages: (languages: string[]) =>
    ipcRenderer.invoke('set-spellchecker-languages', languages),
  getSpellcheckerLanguages: () =>
    ipcRenderer.invoke('get-spellchecker-languages') as Promise<string[]>,

  getAllSpellcheckerLanguages: () =>
    ipcRenderer.invoke('get-all-spellchecker-languages') as Promise<string[]>,

  getSpellcheckerWords: () =>
    ipcRenderer.invoke('get-spellchecker-words') as Promise<string[]>,
  setSpellcheckerWords: (words: string[]) =>
    ipcRenderer.invoke('set-spellchecker-words', words),
});
