/* eslint-disable @nrwl/nx/enforce-module-boundaries */
import { INestApplication } from '@nestjs/common';
import { PostyBirbEnvConfig } from '@postybirb/utils/electron';
import { bootstrapClientServer } from 'apps/client-server/src/main';
import { app, BrowserWindow, powerSaveBlocker } from 'electron';
import contextMenu from 'electron-context-menu';
import PostyBirb from './app/app';
import ElectronEvents from './app/events/electron.events';
import { environment } from './environments/environment';
import { startMetrics } from './metrics';

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

// Setup Metrics
startMetrics();

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const psbId = powerSaveBlocker.start('prevent-app-suspension');

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

contextMenu();

export default class Main {
  static initialize() {
    // Nothing yet
  }

  static bootstrapClientServer(): Promise<INestApplication> {
    return bootstrapClientServer();
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
    Main.initialize();

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
    console.error(e);
    app.quit();
  }
}

start();
