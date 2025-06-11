import { app } from 'electron';
import minimist from 'minimist';
import { getStartupOptions } from './startup-options-electron';

export type AppEnvConfig = {
  port: string;
  headless: boolean;
};

function showHelp(): void {
  // Get version from Electron app or fallback to known version
  const version = app.getVersion() || '4.0.2';

  const helpText = `
PostyBirb v${version}
A desktop application for posting to multiple websites from one simple form.

USAGE:
  postybirb [OPTIONS]

OPTIONS:
  --port <number>     Set the server port (default: 9487)
                      Port must be between 1024 and 65535
                      Can also be set via POSTYBIRB_PORT environment variable

  --headless          Run in headless mode (no GUI)
                      Can also be set via POSTYBIRB_HEADLESS=true environment variable

  --help, -h          Show this help message and exit

EXAMPLES:
  postybirb                    # Start with default settings
  postybirb --port 8080        # Start on port 8080
  postybirb --headless         # Start in headless mode
  postybirb --port 8080 --headless  # Start on port 8080 in headless mode

ENVIRONMENT VARIABLES:
  POSTYBIRB_PORT      Set the server port
  POSTYBIRB_HEADLESS  Set to 'true' to run in headless mode

For more information, visit: https://github.com/mvdicarlo/postybirb
`;

  // eslint-disable-next-line no-console
  console.log(helpText);
  app.quit();
}

const config: AppEnvConfig = {
  port:
    process.env.POSTYBIRB_PORT || getStartupOptions().port.toString() || '9487',
  headless: process.env.POSTYBIRB_HEADLESS === 'true' || false,
};

const args = minimist(process.argv.slice(process.defaultApp ? 2 : 1));

// Handle help flag first
if (args.help || args.h) {
  showHelp();
}

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
    'Invalid port number. Please provide a port number between 1024 and 65535.',
  );
  app.quit();
}

export { config as PostyBirbEnvConfig };

