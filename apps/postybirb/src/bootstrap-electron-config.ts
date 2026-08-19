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

function getDataPath(name: Parameters<typeof app.getPath>[0]): string | null {
  try {
    return app.getPath(name);
  } catch (error) {
    console.error(`Failed to get path for ${name}:`, error);
    return null;
  }
}

/**
 * Resolves the default data directory, preferring (highest to lowest):
 * `<documents>/PostyBirb`, `<home>/Documents/PostyBirb`, `<userData>/PostyBirb`.
 * OneDrive-backed documents folders on Windows are skipped because syncing
 * corrupts the database.
 */
function resolveDefaultAppDataPath(userDataPath: string): string {
  const documentsPath = getDataPath('documents');
  if (documentsPath && !(isWindows() && documentsPath.includes('OneDrive'))) {
    return join(documentsPath, 'PostyBirb');
  }

  const homePath = getDataPath('home');
  if (homePath) {
    return join(homePath, 'Documents', 'PostyBirb');
  }

  return join(userDataPath, 'PostyBirb');
}

const userDataPath = app.getPath('userData');
const defaultAppDataPath = resolveDefaultAppDataPath(userDataPath);

StartupOptionsManager.configure({
  storagePath: join(userDataPath, 'startup.json'),
  defaultAppDataPath,
});

RemoteConfigManager.configure({
  storagePath: join(userDataPath, 'remote-config.json'),
});
