// eslint-disable-next-line import/no-extraneous-dependencies
import { app, BrowserWindow, powerSaveBlocker } from 'electron';
// eslint-disable-next-line @nrwl/nx/enforce-module-boundaries
import { INestApplication } from '@nestjs/common';
import { bootstrapClientServer } from 'apps/client-server/src/main';
import * as contextMenu from 'electron-context-menu';
import App from './app/app';
import ElectronEvents from './app/events/electron.events';
import SquirrelEvents from './app/events/squirrel.events';
import { environment } from './environments/environment';

const isOnlyInstance = app.requestSingleInstanceLock();
if (!isOnlyInstance) {
  app.quit();
  process.exit();
}

app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-features', 'CrossOriginOpenerPolicy');

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
    callback: (allow: boolean) => void
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
  }
);

process.env.APP_PORT = process.env.APP_PORT ?? '9487';
process.env.APP_VERSION = environment.version;

contextMenu();

export default class Main {
  static initialize() {
    if (SquirrelEvents.handleEvents()) {
      // squirrel event handled (except first run event) and app will exit in 1000ms, so don't do anything else
      app.quit();
    }
  }

  static bootstrapClientServer(): Promise<INestApplication> {
    return bootstrapClientServer();
  }

  static bootstrapApp(nestApp: INestApplication) {
    App.main(app, BrowserWindow);
    App.registerNestApp(nestApp);
  }

  static bootstrapAppEvents() {
    ElectronEvents.bootstrapElectronEvents();

    // initialize auto updater service
    if (!App.isDevelopmentMode()) {
      // UpdateEvents.initAutoUpdateService();
    }
  }
}

// handle setup events as quickly as possible
Main.initialize();

// bootstrap app
Main.bootstrapClientServer()
  .then((nestApp) => {
    Main.bootstrapApp(nestApp);
    Main.bootstrapAppEvents();
  })
  .catch((err) => {
    console.error(err);
    app.quit();
  });
