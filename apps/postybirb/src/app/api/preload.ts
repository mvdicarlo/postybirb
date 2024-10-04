import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  pickDirectory: () => ipcRenderer.invoke('pick-directory'),
  openExternalLink: (url: string) =>
    ipcRenderer.send('open-external-link', url),
  platform: process.platform,
  app_port: process.env.POSTYBIRB_PORT,
  app_version: process.env.POSTYBIRB_VERSION,
});
