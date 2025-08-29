import { contextBridge, ipcRenderer } from 'electron';

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
});
