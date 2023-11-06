/**
 * This module is responsible on handling all the inter process communications
 * between the frontend to the electron backend.
 */

// eslint-disable-next-line import/no-extraneous-dependencies
import { app, ipcMain, dialog } from 'electron';
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

ipcMain.handle('pick-directory', async (): Promise<string | undefined> => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  });
  if (!canceled) {
    return filePaths[0];
  }

  return undefined;
});

// Handle App termination
ipcMain.on('quit', (event, code) => {
  app.exit(code);
});
