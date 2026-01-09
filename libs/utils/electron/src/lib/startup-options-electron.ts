import { app } from 'electron';
import {
  accessSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'fs';
import { dirname, join } from 'path';
import { isWindows } from './utils-electron';

export type StartupOptions = {
  startAppOnSystemStartup: boolean;
  spellchecker: boolean;
  appDataPath: string;
  port: string;
};

const FILE_PATH = join(app.getPath('appData'), 'PostyBirb', 'startup.json');
const DOCUMENTS_PATH = join(app.getPath('documents'), 'PostyBirb');
const DEFAULT_APP_DATA_PATH =
  isWindows() && DOCUMENTS_PATH.includes('OneDrive')
    ? join(app.getPath('home'), 'Documents', 'PostyBirb')
    : DOCUMENTS_PATH;

const DEFAULT_STARTUP_OPTIONS: StartupOptions = {
  startAppOnSystemStartup: false,
  spellchecker: true,
  port: '9487',
  appDataPath: DEFAULT_APP_DATA_PATH,
};

function init(): StartupOptions {
  try {
    if (existsSync(FILE_PATH) === false) {
      return DEFAULT_STARTUP_OPTIONS;
    }

    const opts = JSON.parse(readFileSync(FILE_PATH, 'utf-8'));
    if (opts) {
      return { ...DEFAULT_STARTUP_OPTIONS, ...opts };
    }
    return DEFAULT_STARTUP_OPTIONS;
  } catch {
    return DEFAULT_STARTUP_OPTIONS;
  }
}

let startupOptions: StartupOptions;
const listeners: Array<(opts: StartupOptions) => void> = [];

function saveStartupOptions(opts: StartupOptions) {
  try {
    const sOpts = JSON.stringify(opts);
    writeFileSync(FILE_PATH, sOpts);
    // eslint-disable-next-line no-console
    console.log('Saved startup options', FILE_PATH);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Attempting to save startup options failed:', error);
  }
}

export const getStartupOptions = (): StartupOptions => {
  if (!startupOptions) {
    startupOptions = init();
    if (existsSync(FILE_PATH) === false) {
      const dir = dirname(FILE_PATH);
      try {
        accessSync(dir);
      } catch {
        mkdirSync(dir, { recursive: true });
      }
      saveStartupOptions(startupOptions);
    }
  }
  return { ...startupOptions };
};

export function setStartupOptions(opts: Partial<StartupOptions>): void {
  if (!startupOptions) {
    startupOptions = init();
  }
  startupOptions = { ...getStartupOptions(), ...opts };
  saveStartupOptions(startupOptions);
  listeners.forEach((listener) => listener(startupOptions));
}

export function onStartupOptionsUpdate(
  listener: (opts: StartupOptions) => void,
): void {
  if (!listeners.includes(listener)) {
    listeners.push(listener);
  }
}
