import {
    getStartupOptions,
    IsTestEnvironment,
} from '@postybirb/utils/electron';
import { app } from 'electron';
import { join } from 'path';
import { deleteDirSync, ensureDirSync } from './fs';

/**
 * Startup options
 */
const STARTUP_OPTIONS = getStartupOptions();

/**
 * Base PostyBirb document directory.
 */
const POSTYBIRB_DIRECTORY = IsTestEnvironment()
  ? join(__dirname.split('libs')[0], 'test')
  : (STARTUP_OPTIONS.appDataPath ??
    join(app.getPath('documents'), 'PostyBirb'));

/** Directory that stores PostyBirb data. */
const DATA_DIRECTORY = join(POSTYBIRB_DIRECTORY, 'data');

/** Directory that stores application logs. */
const LOGS_DIRECTORY = join(POSTYBIRB_DIRECTORY, 'logs');

/** Directory used for storing uploaded files. */
const TEMP_DIRECTORY = join(POSTYBIRB_DIRECTORY, 'temp');

/** Flag to prevent redundant initialization */
let directoriesInitialized = false;

function clearTempDirectory() {
  deleteDirSync(TEMP_DIRECTORY);
  ensureDirSync(TEMP_DIRECTORY);
}

function initializeDirectories() {
  if (directoriesInitialized) {
    return;
  }
  
  ensureDirSync(DATA_DIRECTORY);
  ensureDirSync(LOGS_DIRECTORY);
  clearTempDirectory();
  
  directoriesInitialized = true;
}

export {
    clearTempDirectory,
    DATA_DIRECTORY,
    initializeDirectories,
    LOGS_DIRECTORY,
    POSTYBIRB_DIRECTORY,
    TEMP_DIRECTORY
};

