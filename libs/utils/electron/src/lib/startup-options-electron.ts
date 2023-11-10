// eslint-disable-next-line import/no-extraneous-dependencies
import { app } from 'electron';
import { join } from 'path';
import { readFileSync, writeFileSync } from 'fs';

export type StartupOptions = {
  startAppOnSystemStartup: boolean;
};

const FILE_PATH = join(app.getAppPath(), 'startup.json');
const DEFAULT_STARTUP_OPTIONS = {
  startAppOnSystemStartup: false,
};

function init(): StartupOptions {
  try {
    const opts = JSON.parse(readFileSync(FILE_PATH, 'utf-8'));
    return opts ?? DEFAULT_STARTUP_OPTIONS;
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
    console.error(error);
  }
}

export const getStartupOptions = (): StartupOptions => ({ ...startupOptions });
export function setStartupOptions(opts: StartupOptions): void {
  startupOptions = { ...opts };
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
