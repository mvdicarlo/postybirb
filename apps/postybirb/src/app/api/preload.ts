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
  platform: process.platform,
  app_port: process.env.POSTYBIRB_PORT,
  app_version: process.env.POSTYBIRB_VERSION,
});
