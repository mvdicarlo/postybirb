// Side-effect module: configures all electron-derived paths required by
// @postybirb/utils/common and @postybirb/fs before those libraries
// evaluate. Imported as the very first line of apps/postybirb/src/main.ts so
// that downstream module-load reads (e.g. PostyBirbDirectories) succeed.
import {
  isWindows,
  RemoteConfigManager,
  StartupOptionsManager,
} from '@postybirb/utils/common';
import { app } from 'electron';
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
