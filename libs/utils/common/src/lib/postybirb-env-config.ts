import minimist from 'minimist';
import { StartupOptionsManager } from './startup-options';

export type AppEnvConfig = {
  port: string;
  headless: boolean;
};

const args = minimist(
  process.argv.slice((process as NodeJS.Process & { defaultApp?: boolean }).defaultApp ? 2 : 1),
);

let cached: AppEnvConfig | null = null;

function safeStartupPort(): string | undefined {
  try {
    return StartupOptionsManager.get().port.toString();
  } catch {
    // StartupOptionsManager throws when not configured (e.g. test process
    // without the application bootstrap); fall back to undefined so the
    // hard-coded default is used.
    return undefined;
  }
}

function compute(): AppEnvConfig {
  const port =
    args.port?.toString() ||
    process.env.POSTYBIRB_PORT ||
    safeStartupPort() ||
    '9487';
  const headless =
    Boolean(args.headless) || process.env.POSTYBIRB_HEADLESS === 'true';
  return { port, headless };
}

/**
 * Lazily-evaluated environment config. Properties are computed on first
 * property access so importing this module never triggers host-application
 * initialisation paths.
 */
export const PostyBirbEnvConfig: AppEnvConfig = Object.freeze({
  get port(): string {
    if (!cached) cached = compute();
    return cached.port;
  },
  get headless(): boolean {
    if (!cached) cached = compute();
    return cached.headless;
  },
}) as AppEnvConfig;

function showHelp(version: string): void {
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
}

export type ValidateEnvConfigOptions = {
  /** App version to render in the --help banner. */
  version: string;
  /**
   * Invoked when validation fails (either `--help` was passed or the
   * configured port is outside the allowed range). Callers should typically
   * quit the process here (e.g. `app.quit()` from electron).
   */
  onValidationFailed: (reason: 'help' | 'invalid-port') => void;
};

/**
 * Validate the parsed env config and handle the `--help` flag. Delegates
 * process termination to the caller via `onValidationFailed` so this module
 * has no host-application coupling.
 */
export function validateEnvConfigOrExit(
  options: ValidateEnvConfigOptions,
): void {
  if (args.help || args.h) {
    showHelp(options.version);
    options.onValidationFailed('help');
    return;
  }
  const portNumber = parseInt(PostyBirbEnvConfig.port, 10);
  if (!(portNumber >= 1024 && portNumber <= 65535)) {
    // eslint-disable-next-line no-console
    console.error(
      'Invalid port number. Please provide a port number between 1024 and 65535.',
    );
    options.onValidationFailed('invalid-port');
  }
}

