import { INestApplication } from '@nestjs/common';
import { PostyBirbDirectories } from '@postybirb/fs';
import {
  flushAppInsights,
  initializeAppInsights,
  Logger,
  trackException,
} from '@postybirb/logger';
import { getRemoteConfig, PostyBirbEnvConfig } from '@postybirb/utils/electron';
import { app, BrowserWindow, session } from 'electron';
import contextMenu from 'electron-context-menu';
import PostyBirb from './app/app';
import ElectronEvents from './app/events/electron.events';
import { environment } from './environments/environment';

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

// eslint-disable-next-line no-console
console.log(
  `Starting PostyBirb v${environment.version} in ${process.env.POSTYBIRB_ENV} mode with port ${PostyBirbEnvConfig.port}`,
);
// eslint-disable-next-line no-console
console.log('Storage', PostyBirbDirectories.POSTYBIRB_DIRECTORY);
// eslint-disable-next-line no-console
console.log('App data', app.getAppPath());

initializeAppInsights({
  // enabled: environment.production || process.env.ENABLE_APP_INSIGHTS === 'true',
  enabled: true,
  appVersion: environment.version,
});

const logger = Logger('MainProcess');

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
  const error = reason instanceof Error ? reason : new Error(String(reason));
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

export default class Main {
  static async initialize() {
    process.env.remote = JSON.stringify(await getRemoteConfig());
  }

  static async bootstrapClientServer(): Promise<INestApplication> {
    return (
      // eslint-disable-next-line @nrwl/nx/enforce-module-boundaries
      (await import('apps/client-server/src/main')).bootstrapClientServer()
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
    const nestApp = await Main.bootstrapClientServer();
    if (PostyBirbEnvConfig.headless) {
      // eslint-disable-next-line no-console
      console.log('Headless mode enabled.');
    } else {
      Main.bootstrapApp(nestApp);
      Main.bootstrapAppEvents();
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Error during startup:', e);
    app.quit();
  }
}

// Suppress SSL error messages
app.on('ready', () => {
  if (!PostyBirbEnvConfig.headless) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    const loader = require('./app/loader/loader');
    loader.show();
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
