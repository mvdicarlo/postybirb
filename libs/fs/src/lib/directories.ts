// eslint-disable-next-line import/no-extraneous-dependencies
import { app } from 'electron';
import { join } from 'path';
import { ensureDirSync, deleteDirSync } from './fs';

const IS_TEST_DIRECTORY = process.env.NODE_ENV === 'test';

const DOCUMENTS_DIRECTORY = IS_TEST_DIRECTORY
  ? join('./', 'test')
  : app.getPath('documents');

/**
 * Base PostyBirb document directory.
 */
const POSTYBIRB_DIRECTORY = join(DOCUMENTS_DIRECTORY, 'PostyBirb');

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
  POSTYBIRB_DIRECTORY,
  DATA_DIRECTORY,
  TEMP_DIRECTORY,
  LOGS_DIRECTORY,
  initializeDirectories,
  clearTempDirectory,
};
