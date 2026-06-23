/**
 * Main-process IPC handlers.
 *
 * Every channel validates that the request originates from PostyBirb's own
 * trusted UI (a loopback origin) before performing any privileged work. The
 * synchronous metadata channels exist so the sandboxed preload — which can no
 * longer read process.env — can still expose app metadata synchronously.
 */
import { onProxyConfigurationApplied } from '@postybirb/http';
import { Logger } from '@postybirb/logger';
import {
  getPartitionKey,
  PostyBirbEnvConfig,
  type RemoteConfig,
  RemoteConfigManager,
} from '@postybirb/utils/common';
import { app, BrowserWindow, dialog, ipcMain, session } from 'electron';
import { environment } from '../../environments/environment';
import { type AppMetadata, IPC_CHANNELS } from '../constants';
import { isLoopbackAppUrl, openExternalUrl } from '../main-process/security';

const logger = Logger('ElectronEvents');

type TrustableEvent = Electron.IpcMainEvent | Electron.IpcMainInvokeEvent;

let proxyBroadcastRegistered = false;

function registerProxyConfigBroadcast(): void {
  if (proxyBroadcastRegistered) {
    return;
  }

  proxyBroadcastRegistered = true;
  onProxyConfigurationApplied(() => {
    for (const window of BrowserWindow.getAllWindows()) {
      if (window.isDestroyed()) {
        continue;
      }

      window.webContents.send('proxy-config-applied');
    }
  });
}

/** True only when the IPC request comes from PostyBirb's own loopback UI. */
function isTrustedSender(event: TrustableEvent): boolean {
  const frame = event.senderFrame;
  return frame ? isLoopbackAppUrl(frame.url) : false;
}

/** Throw for invoke-style handlers when the sender is not trusted. */
function assertTrustedSender(event: TrustableEvent, channel: string): void {
  if (!isTrustedSender(event)) {
    logger.warn(`Rejected IPC '${channel}' from an untrusted sender.`);
    throw new Error(`Rejected IPC '${channel}' from an untrusted sender.`);
  }
}

/** Register all IPC handlers. Call once, before the main window is created. */
export function bootstrapElectronEvents(): Electron.IpcMain {
  registerProxyConfigBroadcast();

  // --- Synchronous metadata (a sandboxed preload cannot read process.env) ---

  ipcMain.on(IPC_CHANNELS.getAppMetadata, (event) => {
    /* eslint-disable no-param-reassign */
    if (!isTrustedSender(event)) {
      event.returnValue = null;
      return;
    }

    const metadata: AppMetadata = {
      platform: process.platform,
      app_port: String(PostyBirbEnvConfig.port),
      app_version: environment.version,
    };
    event.returnValue = metadata;
    /* eslint-enable no-param-reassign */
  });

  ipcMain.on(IPC_CHANNELS.getRemoteConfig, (event) => {
    /* eslint-disable no-param-reassign */
    const fallback: RemoteConfig = { enabled: false, password: '' };
    if (!isTrustedSender(event)) {
      event.returnValue = fallback;
      return;
    }

    event.returnValue = RemoteConfigManager.getSync() ?? fallback;
    /* eslint-enable no-param-reassign */
  });

  // --- Account session data ---

  // Return cookies for an account, bundled as base64.
  ipcMain.handle(
    IPC_CHANNELS.getCookiesForAccount,
    async (event, accountId: string) => {
      assertTrustedSender(event, IPC_CHANNELS.getCookiesForAccount);

      const cookies = await session
        .fromPartition(`persist:${accountId}`)
        .cookies.get({});

      return Buffer.from(JSON.stringify(cookies)).toString('base64');
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.getLocalStorageForAccount,
    async (event, accountId: string, url: string) => {
      assertTrustedSender(event, IPC_CHANNELS.getLocalStorageForAccount);

      // Easier to duplicate this than to reach ElectronBrowserService here.
      const bw = new BrowserWindow({
        show: false,
        webPreferences: {
          partition: getPartitionKey(accountId),
          sandbox: true,
          contextIsolation: true,
          nodeIntegration: false,
        },
      });

      try {
        await bw.loadURL(url);
        return await bw.webContents.executeJavaScript(
          'JSON.parse(JSON.stringify(localStorage))',
        );
      } finally {
        if (!bw.isDestroyed()) {
          bw.destroy();
        }
      }
    },
  );

  // --- Utilities ---

  ipcMain.handle(IPC_CHANNELS.getLanIp, async (event) => {
    assertTrustedSender(event, IPC_CHANNELS.getLanIp);

    const os = await import('os');
    const networkInterfaces = os.networkInterfaces();

    for (const networkInterface of Object.values(networkInterfaces)) {
      if (!networkInterface) {
        continue;
      }
      for (const address of networkInterface) {
        if (address.family === 'IPv4' && !address.internal) {
          return address.address;
        }
      }
    }

    return undefined;
  });

  ipcMain.handle(
    IPC_CHANNELS.pickDirectory,
    async (
      event,
      defaultPath: string | undefined,
    ): Promise<string | undefined> => {
      assertTrustedSender(event, IPC_CHANNELS.pickDirectory);

      if (defaultPath && typeof defaultPath !== 'string') {
        throw new Error('Expected default path to be a string');
      }

      const { canceled, filePaths } = await dialog.showOpenDialog({
        defaultPath,
        properties: ['openDirectory'],
      });

      return canceled ? undefined : filePaths[0];
    },
  );

  ipcMain.on(IPC_CHANNELS.openExternalLink, (event, url: string) => {
    if (!isTrustedSender(event)) {
      return;
    }
    openExternalUrl(url);
  });

  ipcMain.on(IPC_CHANNELS.quit, (event, code?: number) => {
    if (!isTrustedSender(event)) {
      return;
    }
    app.exit(code);
  });

  // --- Spellchecker ---

  ipcMain.handle(
    IPC_CHANNELS.setSpellcheckerEnabled,
    (event, value: boolean) => {
      assertTrustedSender(event, IPC_CHANNELS.setSpellcheckerEnabled);
      return event.sender.session.setSpellCheckerEnabled(value);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.setSpellcheckerLanguages,
    (event, languages: string[]) => {
      assertTrustedSender(event, IPC_CHANNELS.setSpellcheckerLanguages);
      event.sender.session.setSpellCheckerLanguages(languages);
    },
  );

  ipcMain.handle(IPC_CHANNELS.getSpellcheckerLanguages, (event) => {
    assertTrustedSender(event, IPC_CHANNELS.getSpellcheckerLanguages);
    return event.sender.session.getSpellCheckerLanguages();
  });

  ipcMain.handle(IPC_CHANNELS.getAllSpellcheckerLanguages, (event) => {
    assertTrustedSender(event, IPC_CHANNELS.getAllSpellcheckerLanguages);
    return event.sender.session.availableSpellCheckerLanguages;
  });

  ipcMain.handle(IPC_CHANNELS.getSpellcheckerWords, (event) => {
    assertTrustedSender(event, IPC_CHANNELS.getSpellcheckerWords);
    return event.sender.session.listWordsInSpellCheckerDictionary();
  });

  ipcMain.handle(
    IPC_CHANNELS.setSpellcheckerWords,
    async (event, words: string[]) => {
      assertTrustedSender(event, IPC_CHANNELS.setSpellcheckerWords);

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
    },
  );

  return ipcMain;
}
