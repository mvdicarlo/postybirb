import { INestApplication } from '@nestjs/common';
import { isOSX } from '@postybirb/utils/electron';
// eslint-disable-next-line import/no-extraneous-dependencies
import {
  BrowserWindow,
  Menu,
  Tray,
  WebContentsWillNavigateEventParams,
  globalShortcut,
  nativeImage,
  screen,
  shell,
} from 'electron';
import { join } from 'path';
import { environment } from '../environments/environment';
import { rendererAppPort } from './constants';

const appIcon = join(__dirname, 'assets/app-icon.png');

export default class App {
  // Keep a global reference of the window object, if you don't, the window will
  // be closed automatically when the JavaScript object is garbage collected.
  static mainWindow: Electron.BrowserWindow;

  static application: Electron.App;

  static BrowserWindow;

  static appTray: Tray;

  static nestApp: INestApplication;

  public static isDevelopmentMode() {
    return environment.production;
  }

  private static onWindowAllClosed() {
    if (process.platform !== 'darwin') {
      App.application.quit();
    }
  }

  private static onClose() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    App.mainWindow = null;
  }

  private static onRedirect(
    details: WebContentsWillNavigateEventParams & {
      preventDefault: () => void;
    }
  ) {
    const { url, preventDefault } = details;
    if (url !== App.mainWindow.webContents.getURL()) {
      // this is a normal external redirect, open it in a new browser window
      preventDefault();
      shell.openExternal(url);
    }
  }

  private static onReady() {
    // This method will be called when Electron has finished
    // initialization and is ready to create browser windows.
    // Some APIs can only be used after this event occurs.
    App.initAppTray();
    App.initMainWindow();
    App.loadMainWindow();
  }

  private static onActivate() {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (App.mainWindow === null) {
      App.onReady();
    }
  }

  private static async onQuit() {
    if (App.nestApp) {
      await App.nestApp.close();
    }
    process.exit();
  }

  private static initMainWindow() {
    const { workAreaSize } = screen.getPrimaryDisplay();
    const width = Math.min(1280, workAreaSize.width || 1280);
    const height = Math.min(720, workAreaSize.height || 720);

    // Create the browser window.
    App.mainWindow = new BrowserWindow({
      width,
      height,
      show: false,
      icon: appIcon,
      autoHideMenuBar: true,
      webPreferences: {
        contextIsolation: true,
        backgroundThrottling: false,
        preload: join(__dirname, 'preload.js'),
        webviewTag: true,
        spellcheck: true,
        devTools: true,
      },
    });
    App.mainWindow.setMenu(null);
    App.mainWindow.center();

    // if main window is ready to show, close the splash window and show the main window
    App.mainWindow.once('ready-to-show', () => {
      App.mainWindow.show();

      if (App.isDevelopmentMode()) {
        App.mainWindow.webContents.openDevTools();
      }
    });

    // Emitted when the window is closed.
    App.mainWindow.on('closed', () => {
      App.onClose();
    });

    App.mainWindow.webContents.on('will-navigate', (details) => {
      App.onRedirect(details);
    });
  }

  private static loadMainWindow() {
    // load the index.html of the app.
    if (this.isDevelopmentMode()) {
      App.mainWindow.loadURL(`http://localhost:${rendererAppPort}`);
    } else {
      App.mainWindow.loadURL(`https://localhost:${process.env.APP_PORT}`);
    }
  }

  private static initAppTray() {
    if (!App.appTray) {
      const trayItems: Array<
        Electron.MenuItem | Electron.MenuItemConstructorOptions
      > = [
        {
          label: 'Open',
          click() {
            App.showMainWindow();
          },
        },
        {
          label: 'Quit',
          click() {
            App.application.quit();
          },
        },
      ];

      let image = nativeImage.createFromPath(appIcon);
      if (isOSX()) {
        image = image.resize({
          width: 16,
          height: 16,
        });
      }

      const tray = new Tray(image);
      tray.setContextMenu(Menu.buildFromTemplate(trayItems));
      tray.setToolTip('PostyBirb');
      tray.on('click', () => App.showMainWindow());

      App.appTray = tray;
    }
  }

  private static showMainWindow() {
    if (!App.mainWindow) {
      App.onReady();
    } else {
      if (App.mainWindow.isMinimized()) {
        App.mainWindow.show();
      }

      App.mainWindow.focus();
    }
  }

  static main(app: Electron.App, browserWindow: typeof BrowserWindow) {
    globalShortcut.registerAll(['f5', 'CommandOrControl+R'], () => {
      if (App.mainWindow) {
        App.mainWindow.reload();
      }
    });

    App.BrowserWindow = browserWindow;
    App.application = app;

    App.application.on('window-all-closed', App.onWindowAllClosed); // Quit when all windows are closed.
    App.application.on('ready', App.onReady); // App is ready to load data
    App.application.on('activate', App.onActivate); // App is activated
    App.application.on('second-instance', () => {
      if (App.application.isReady()) {
        App.onReady();
      }
    });
    App.application.on('quit', App.onQuit);

    if (App.application.isReady()) {
      App.onReady();
    }
  }

  static registerNestApp(nestApp: INestApplication) {
    App.nestApp = nestApp;
  }
}
