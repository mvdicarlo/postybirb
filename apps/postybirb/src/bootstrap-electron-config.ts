import {
  isWindows,
  RemoteConfigManager,
  StartupOptionsManager,
} from '@postybirb/utils/common';
import { app, net } from 'electron';
import { join } from 'path';

const userDataPath = app.getPath('userData');
const documentsPath = join(app.getPath('documents'), 'PostyBirb');
const defaultAppDataPath =
  isWindows() && documentsPath.includes('OneDrive')
    ? join(app.getPath('home'), 'Documents', 'PostyBirb')
    : documentsPath;

StartupOptionsManager.configure({
  storagePath: join(userDataPath, 'startup.json'),
  defaultAppDataPath,
});

RemoteConfigManager.configure({
  storagePath: join(userDataPath, 'remote-config.json'),
});

if (typeof globalThis.fetch === 'function' && typeof net.fetch === 'function') {
  globalThis.fetch = net.fetch.bind(net) as typeof fetch;
}
