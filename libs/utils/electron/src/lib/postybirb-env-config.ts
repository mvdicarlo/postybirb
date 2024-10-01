import { app } from 'electron';
import minimist from 'minimist';
import { getStartupOptions } from './startup-options-electron';

export type AppEnvConfig = {
  port: string;
  headless: boolean;
};

const config: AppEnvConfig = {
  port:
    process.env.POSTYBIRB_PORT || getStartupOptions().port.toString() || '9487',
  headless: process.env.POSTYBIRB_HEADLESS === 'true' || false,
};

const args = minimist(process.argv.slice(process.defaultApp ? 2 : 1));
if (args.port) {
  config.port = args.port;
}
if (args.headless) {
  config.headless = args.headless;
}

const portNumber = parseInt(config.port, 10);
if (!(portNumber >= 1024 && portNumber <= 65535)) {
  // eslint-disable-next-line no-console
  console.error(
    'Invalid port number. Please provide a port number between 1024 and 65535.'
  );
  app.quit();
}

export { config as PostyBirbEnvConfig };
