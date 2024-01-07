// eslint-disable-next-line import/no-extraneous-dependencies
import { contextBridge, ipcRenderer } from 'electron';
import { preloadBindings } from 'i18next-electron-fs-backend';

contextBridge.exposeInMainWorld('electron', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  pickDirectory: () => ipcRenderer.invoke('pick-directory'),
  platform: process.platform,
  app_port: process.env.APP_PORT,
  app_version: process.env.APP_VERSION,
});

contextBridge.exposeInMainWorld('api', {
  i18nextElectronBackend: preloadBindings(ipcRenderer, process),
});