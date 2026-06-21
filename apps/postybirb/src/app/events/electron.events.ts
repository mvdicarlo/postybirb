/**
 * This module is responsible on handling all the inter process communications
 * between the frontend to the electron backend.
 */

import { applyGlobalProxyConfig } from '@postybirb/http';
import { app, dialog, ipcMain, session, shell } from 'electron';

export default class ElectronEvents {
  static bootstrapElectronEvents(): Electron.IpcMain {
    return ipcMain;
  }
}

// Return cookies for account, bundled as base64
ipcMain.handle('get-cookies-for-account', async (event, accountId: string) => {
  await applyGlobalProxyConfig();
  const sess = session.fromPartition(`persist:${accountId}`);
  const cookies = await sess.cookies.get({});

  return Buffer.from(JSON.stringify(cookies)).toString('base64');
});

ipcMain.handle('apply-proxy-config', async () => {
  await applyGlobalProxyConfig();
});

ipcMain.handle('ensure-partition-proxy', async () => {
  await applyGlobalProxyConfig();
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

ipcMain.handle(
  'pick-directory',
  async (
    event,
    defaultPath: string | undefined,
  ): Promise<string | undefined> => {
    if (defaultPath && typeof defaultPath !== 'string')
      throw new Error('Expected default path to be a string');

    const { canceled, filePaths } = await dialog.showOpenDialog({
      defaultPath,
      properties: ['openDirectory'],
    });
    if (!canceled) {
      return filePaths[0];
    }

    return undefined;
  },
);

ipcMain.on('open-external-link', (event, url) => {
  shell.openExternal(url);
});

// Handle App termination
ipcMain.on('quit', (event, code) => {
  app.exit(code);
});

ipcMain.handle('set-spellchecker-enabled', (event, value) =>
  event.sender.session.setSpellCheckerEnabled(value),
);

ipcMain.handle('set-spellchecker-languages', (event, languages) => {
  event.sender.session.setSpellCheckerLanguages(languages);
});

ipcMain.handle('get-spellchecker-languages', (event) =>
  event.sender.session.getSpellCheckerLanguages(),
);

ipcMain.handle(
  'get-all-spellchecker-languages',
  (event) => event.sender.session.availableSpellCheckerLanguages,
);

ipcMain.handle('get-spellchecker-words', (event) =>
  event.sender.session.listWordsInSpellCheckerDictionary(),
);

ipcMain.handle('set-spellchecker-words', async (event, words) => {
  if (!Array.isArray(words) || !words.every((e) => typeof e === 'string')) {
    throw new Error('Expected words to be a string array');
  }

  const current =
    await event.sender.session.listWordsInSpellCheckerDictionary();

  for (const word of words) {
    if (!current.includes(word)) {
      event.sender.session.addWordToSpellCheckerDictionary(word);
    }
  }
  for (const word of current) {
    if (!words.includes(word)) {
      event.sender.session.removeWordFromSpellCheckerDictionary(word);
    }
  }
});
