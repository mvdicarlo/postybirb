import {
  getStartupOptions,
  IsTestEnvironment,
} from '@postybirb/utils/electron';
import { join } from 'path';
import { deleteDirSync, ensureDirSync } from './fs';

function getPostyBirbDirectory() {
  if (IsTestEnvironment()) {
    return join(__dirname.split('libs')[0], 'test');
  }

  return getStartupOptions().appDataPath;
}

/**
 * Base PostyBirb document directory.
 */
const POSTYBIRB_DIRECTORY = getPostyBirbDirectory();

/** Directory that stores PostyBirb data. */
const DATA_DIRECTORY = join(POSTYBIRB_DIRECTORY, 'data');

/** Directory that stores application logs. */
const LOGS_DIRECTORY = join(POSTYBIRB_DIRECTORY, 'logs');

/** Directory used for storing uploaded files. */
const TEMP_DIRECTORY = join(POSTYBIRB_DIRECTORY, 'temp');

function clearTempDirectory() {
  deleteDirSync(TEMP_DIRECTORY);
  ensureDirSync(TEMP_DIRECTORY);
}

ensureDirSync(DATA_DIRECTORY);
ensureDirSync(LOGS_DIRECTORY);
clearTempDirectory();

export {
  clearTempDirectory,
  DATA_DIRECTORY,
  LOGS_DIRECTORY,
  POSTYBIRB_DIRECTORY,
  TEMP_DIRECTORY,
};
