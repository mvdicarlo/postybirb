/**
 * This module is responsible on handling all the inter process communications
 * between the frontend to the electron backend.
 */

import { app, dialog, ipcMain, session, shell } from 'electron';
import { environment } from '../../environments/environment';

export default class ElectronEvents {
  static bootstrapElectronEvents(): Electron.IpcMain {
    return ipcMain;
  }
}

// Retrieve app version
ipcMain.handle('get-app-version', () => {
  // eslint-disable-next-line no-console
  console.log(`Fetching application version... [v${environment.version}]`);

  return environment.version;
});

// Return cookies for account, bundled as base64
ipcMain.handle('get-cookies-for-account', async (event, accountId: string) => {
  const cookies = await session
    .fromPartition(`persist:${accountId}`)
    .cookies.get({});
  if (cookies.length === 0) {
    return '';
  }
  return Buffer.from(JSON.stringify(cookies)).toString('base64');
});

ipcMain.handle('get-lan-ip', async () => {
  const os = await import('os');
  const networkInterfaces = os.networkInterfaces();
  const addresses: string[] = [];

  for (const interfaceName in networkInterfaces) {
    if (
      Object.prototype.hasOwnProperty.call(networkInterfaces, interfaceName)
    ) {
      const networkInterface = networkInterfaces[interfaceName];
      if (networkInterface) {
        for (const address of networkInterface) {
          if (address.family === 'IPv4' && !address.internal) {
            addresses.push(address.address);
          }
        }
      }
    }
  }

  return addresses.length > 0 ? addresses[0] : undefined;
});

ipcMain.handle('pick-directory', async (): Promise<string | undefined> => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  });
  if (!canceled) {
    return filePaths[0];
  }

  return undefined;
});

ipcMain.on('open-external-link', (event, url) => {
  shell.openExternal(url);
});

// Handle App termination
ipcMain.on('quit', (event, code) => {
  app.exit(code);
});
