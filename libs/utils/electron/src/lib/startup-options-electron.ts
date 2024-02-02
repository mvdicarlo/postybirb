import { app } from 'electron';
import { join } from 'path';
import { readFileSync, writeFileSync } from 'fs';

export type StartupOptions = {
  startAppOnSystemStartup: boolean;
  appDataPath: string;
  port: string;
};

const FILE_PATH = join(app.getAppPath(), 'startup.json');
const DEFAULT_STARTUP_OPTIONS = {
  startAppOnSystemStartup: false,
  port: '9487',
  appDataPath: join(app.getPath('documents'), 'PostyBirb'),
};

function init(): StartupOptions {
  try {
    const opts = JSON.parse(readFileSync(FILE_PATH, 'utf-8'));
    if (opts) {
      return { ...DEFAULT_STARTUP_OPTIONS, ...opts };
    }
    return DEFAULT_STARTUP_OPTIONS;
  } catch {
    return DEFAULT_STARTUP_OPTIONS;
  }
}

let startupOptions: StartupOptions = init();
const listeners: Array<(opts: StartupOptions) => void> = [];

function saveStartupOptions(opts: StartupOptions) {
  try {
    const sOpts = JSON.stringify(opts);
    writeFileSync(FILE_PATH, sOpts);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
  }
}

export const getStartupOptions = (): StartupOptions => ({ ...startupOptions });
export function setStartupOptions(opts: Partial<StartupOptions>): void {
  startupOptions = { ...getStartupOptions(), ...opts };
  saveStartupOptions(startupOptions);
  listeners.forEach((listener) => listener(startupOptions));
}
export function onStartupOptionsUpdate(
  listener: (opts: StartupOptions) => void
): void {
  if (!listeners.includes(listener)) {
    listeners.push(listener);
  }
}
