import { getStartupOptions } from '@postybirb/utils/electron';
// eslint-disable-next-line import/no-extraneous-dependencies
import { app } from 'electron';
import { join } from 'path';
import { deleteDirSync, ensureDirSync } from './fs';


function IsTestEnvironment(): boolean {
  return (process.env.NODE_ENV || '').toLowerCase() === 'test';
}

/**
 * Startup options
 */
const STARTUP_OPTIONS = getStartupOptions();

/**
 * Base PostyBirb document directory.
 */
const POSTYBIRB_DIRECTORY = IsTestEnvironment()
  ? join('./', 'test')
  : STARTUP_OPTIONS.appDataPath ?? join(app.getPath('documents'), 'PostyBirb');

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

function initializeDirectories() {
  ensureDirSync(DATA_DIRECTORY);
  ensureDirSync(LOGS_DIRECTORY);
  clearTempDirectory();
}

export {
  DATA_DIRECTORY,
  LOGS_DIRECTORY,
  POSTYBIRB_DIRECTORY,
  TEMP_DIRECTORY,
  clearTempDirectory,
  initializeDirectories,
};
