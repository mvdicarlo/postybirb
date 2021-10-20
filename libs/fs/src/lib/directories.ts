import { app } from 'electron';
import { join } from 'path';
import { ensureDirSync } from './fs';

const IS_TEST_DIRECTORY = process.env.NODE_ENV === 'Test';

const DOCUMENTS_DIRECTORY = IS_TEST_DIRECTORY
  ? join('./', 'test')
  : app.getPath('documents');

/**
 * Base PostyBirb document directory.
 */
const POSTYBIRB_DIRECTORY = join(DOCUMENTS_DIRECTORY, 'PostyBirb');

/** Directory that stores PostyBirb data. */
const DATA_DIRECTORY = join(POSTYBIRB_DIRECTORY, 'data');

/**
 * Directory that stores website specific data.
 * @todo Consider removing this since it isn't really used anymore.
 */
const WEBSITE_DATA_DIRECTORY = join(DATA_DIRECTORY, 'website-data');

/** Directory used for storing uploaded files. */
const FILE_DIRECTORY = join(POSTYBIRB_DIRECTORY, 'files');

function initializeDirectories() {
  ensureDirSync(DATA_DIRECTORY);
  ensureDirSync(WEBSITE_DATA_DIRECTORY);
  ensureDirSync(FILE_DIRECTORY);
}

export {
  POSTYBIRB_DIRECTORY,
  DATA_DIRECTORY,
  WEBSITE_DATA_DIRECTORY,
  FILE_DIRECTORY,
  initializeDirectories,
};
