// MUST run before any module that depends on configured electron paths
// (e.g. @postybirb/fs evaluates StartupOptionsManager.get() at module load).
import './bootstrap-electron-config';

// Ensure proxy is imported first to patch fetch before any request is made
import '@postybirb/http';

import { INestApplication } from '@nestjs/common';
import { PostyBirbDirectories } from '@postybirb/fs';
import {
    flushAppInsights,
    initializeAppInsights,
    Logger,
    trackException,
} from '@postybirb/logger';
import {
    PostyBirbEnvConfig,
    RemoteConfigManager,
    toError,
    validateEnvConfigOrExit,
} from '@postybirb/utils/common';
import { app, BrowserWindow, crashReporter, session } from 'electron';
import contextMenu from 'electron-context-menu';
import PostyBirb from './app/app';
import ElectronEvents from './app/events/electron.events';
import { environment } from './environments/environment';

// Handle --help and validate --port. Previously this ran implicitly at module
// load inside the env-config lib; now it must be invoked explicitly so that
// importing the env config from non-electron processes (e.g. tests) does not
// pull electron APIs.
validateEnvConfigOrExit({
  version: app.getVersion() || '4.0.2',
  onValidationFailed: () => app.quit(),
});

// Initialize crash reporter
crashReporter.start({
  productName: 'PostyBirb',
  companyName: 'PostyBirb',
  uploadToServer: false,
});

const isOnlyInstance = app.requestSingleInstanceLock();
if (!isOnlyInstance) {
  app.quit();
  process.exit();
}

app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-features', 'CrossOriginOpenerPolicy');

// Inject environment for use in preload
process.env.POSTYBIRB_PORT = PostyBirbEnvConfig.port;
process.env.POSTYBIRB_VERSION = environment.version;
process.env.POSTYBIRB_ENV =
  (process.env.POSTYBIRB_ENV ?? environment.production)
    ? 'production'
    : 'development';

const remoteConfig = RemoteConfigManager.getSync();
const entries: [string, string][] = [
  ['Version', environment.version],
  ['Mode', process.env.POSTYBIRB_ENV ?? ''],
  ['Port', String(PostyBirbEnvConfig.port)],
  ['Storage', PostyBirbDirectories.POSTYBIRB_DIRECTORY],
  ['App Data', app.getPath('userData')],
  ['===== Remote Config =====', ''],
  ['Remote Enabled', String(remoteConfig?.enabled)],
  [
    'Remote Password',
    remoteConfig?.enabled ? (remoteConfig?.password ?? '') : '',
  ],
];
const labelWidth = Math.max(...entries.map(([k]) => k.length));
const valueWidth = Math.max(...entries.map(([, v]) => v.length));
// "║  Label : Value  ║" → 2 + labelWidth + 3 + valueWidth + 2
const innerWidth = 2 + labelWidth + 3 + valueWidth + 2;
const title = 'PostyBirb';
const titlePad = Math.max(innerWidth, title.length + 4);
const w = Math.max(innerWidth, titlePad);
const titleLine = title.padStart(Math.floor((w + title.length) / 2)).padEnd(w);

const lines = entries.map(
  ([k, v]) => `║  ${k.padEnd(labelWidth)} : ${v.padEnd(valueWidth)}  ║`,
);

// eslint-disable-next-line no-console
console.log(
  [
    '',
    `╔${'═'.repeat(w)}╗`,
    `║${titleLine}║`,
    `╠${'═'.repeat(w)}╣`,
    ...lines,
    `╚${'═'.repeat(w)}╝`,
    '',
  ].join('\n'),
);

initializeAppInsights({
  enabled: true,
  appVersion: environment.version,
});

const logger = Logger('MainProcess');
const BOOTSTRAP_TIMEOUT_MS = 180_000;

type LoaderModule = {
  show: () => void;
  hide: () => void;
};

let loaderModule: LoaderModule | null = null;
let isQuittingDueToStartupFailure = false;

function getLoaderModule(): LoaderModule | null {
  if (PostyBirbEnvConfig.headless) {
    return null;
  }

  if (loaderModule) {
    return loaderModule;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    loaderModule = require('./app/loader/loader');
    return loaderModule;
  } catch (error) {
    logger
      .withError(toError(error))
      .warn('Failed to load startup loader module.');
    return null;
  }
}

function hideLoaderSafely(reason: string) {
  const loader = getLoaderModule();
  if (!loader) {
    return;
  }

  try {
    loader.hide();
  } catch (error) {
    logger
      .withError(toError(error))
      .warn(`Failed to hide startup loader window (${reason}).`);
  }
}

async function bootstrapClientServerWithTimeout(): Promise<INestApplication> {
  return Promise.race([
    Main.bootstrapClientServer(),
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(
            `Timed out bootstrapping client server after ${BOOTSTRAP_TIMEOUT_MS}ms.`,
          ),
        );
      }, BOOTSTRAP_TIMEOUT_MS);
    }),
  ]);
}

function quitOnStartupFailure(error: unknown) {
  if (isQuittingDueToStartupFailure) {
    return;
  }

  isQuittingDueToStartupFailure = true;
  const startupError = toError(error);
  logger.withError(startupError).error('Fatal startup failure. Quitting app.');
  trackException(startupError, {
    source: 'electron-main',
    type: 'startupFailure',
  });

  hideLoaderSafely('startup-failure');

  const forceExitTimer = setTimeout(() => {
    app.exit(1);
  }, 5_000);
  forceExitTimer.unref();

  flushAppInsights().finally(() => {
    app.quit();
  });
}

// Handle uncaught exceptions in main process
process.on('uncaughtException', (error: Error) => {
  // eslint-disable-next-line no-console
  logger.withError(error).error('Uncaught Exception in Main Process:');
  trackException(error, {
    source: 'electron-main',
    type: 'uncaughtException',
  });
  // Give time for telemetry to be sent before exiting
  flushAppInsights().then(() => {
    if (!environment.production) {
      process.exit(1);
    }
  });
});

// Handle unhandled promise rejections in main process
process.on('unhandledRejection', (reason: unknown) => {
  const error = toError(reason);
  // eslint-disable-next-line no-console
  logger.withError(error).error('Unhandled Rejection in Main Process:');
  trackException(error, {
    source: 'electron-main',
    type: 'unhandledRejection',
  });
  flushAppInsights();
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
// const psbId = powerSaveBlocker.start('prevent-app-suspension');

app.on(
  'certificate-error',
  (
    event: Electron.Event,
    webContents: Electron.WebContents,
    url: string,
    error: string,
    certificate: Electron.Certificate,
    callback: (allow: boolean) => void,
  ) => {
    if (
      certificate.issuerName === 'postybirb.com' &&
      certificate.subject.organizations[0] === 'PostyBirb' &&
      certificate.issuer.country === 'US'
    ) {
      callback(true);
    } else {
      callback(false);
    }
  },
);

// Observe crashes of child processes (GPU, utility, renderer-host, etc.). A GPU
// process crash is the classic cause of a "graphics context lost" frozen window
// on long-running sessions; logging it here makes that diagnosable. Electron
// usually relaunches the GPU process automatically, so this is diagnostic only —
// renderer recovery is handled per-window in app.ts.
app.on('child-process-gone', (_event, details) => {
  const { type, reason, exitCode, serviceName, name } = details;
  const parts = [`type: ${type}`, `reason: ${reason}`, `exitCode: ${exitCode}`];
  if (serviceName) {
    parts.push(`service: ${serviceName}`);
  }
  if (name) {
    parts.push(`name: ${name}`);
  }
  const message = `Child process gone — ${parts.join(', ')}`;

  // 'clean-exit' is a normal shutdown of a child (e.g. the sharp worker); only
  // treat abnormal terminations as problems worth tracking.
  if (reason === 'clean-exit') {
    logger.info(message);
    return;
  }

  logger.error(message);
  trackException(new Error(message), {
    source: 'electron-main',
    type: 'childProcessGone',
    childType: type,
    reason,
    exitCode: String(exitCode),
    ...(serviceName ? { serviceName } : {}),
    ...(name ? { childName: name } : {}),
  });
});

export default class Main {
  static async initialize() {
    process.env.remote = JSON.stringify(await RemoteConfigManager.get());
  }

  static async bootstrapClientServer(): Promise<INestApplication> {
    return (
      // eslint-disable-next-line @nx/enforce-module-boundaries
      (await import('apps/client-server/src/main')).bootstrapClientServer({
        userDataPath: app.getPath('userData'),
      })
    );
  }

  static bootstrapApp(nestApp: INestApplication) {
    PostyBirb.main(app, BrowserWindow);
    PostyBirb.registerNestApp(nestApp);
  }

  static bootstrapAppEvents() {
    ElectronEvents.bootstrapElectronEvents();
  }
}

async function start() {
  try {
    // handle setup events as quickly as possible
    await Main.initialize();

    // bootstrap app
    const nestApp = await bootstrapClientServerWithTimeout();
    if (PostyBirbEnvConfig.headless) {
      // eslint-disable-next-line no-console
      console.log('[PostyBirb] Running in headless mode (no UI)');
    } else {
      Main.bootstrapApp(nestApp);
      Main.bootstrapAppEvents();
    }
  } catch (e) {
    quitOnStartupFailure(e);
  }
}

// Suppress SSL error messages
app.on('ready', () => {
  if (!PostyBirbEnvConfig.headless) {
    const loader = getLoaderModule();
    try {
      loader?.show();
    } catch (error) {
      logger.withError(toError(error)).warn('Failed to show startup loader.');
    }
  }

  session.defaultSession.setCertificateVerifyProc((request, callback) => {
    if (request.errorCode === 0) {
      callback(0); // Allow the certificate
    } else {
      const { certificate } = request;
      if (
        certificate.issuerName === 'postybirb.com' &&
        certificate.subject.organizations[0] === 'PostyBirb' &&
        certificate.issuer.country === 'US'
      ) {
        callback(0);
      } else {
        callback(-2);
      }
    }
  });

  contextMenu();
  start();
});

app.on('before-quit', () => {
  hideLoaderSafely('before-quit');
});
