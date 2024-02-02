import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  pickDirectory: () => ipcRenderer.invoke('pick-directory'),
  platform: process.platform,
  app_port: process.env.APP_PORT,
  app_version: process.env.APP_VERSION,
});
