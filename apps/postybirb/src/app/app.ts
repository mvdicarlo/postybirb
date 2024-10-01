import { INestApplication } from '@nestjs/common';
import {
  PostyBirbEnvConfig,
  getStartupOptions,
  isLinux,
  isOSX,
  onStartupOptionsUpdate,
  setStartupOptions,
} from '@postybirb/utils/electron';
import {
  BrowserWindow,
  Menu,
  Tray,
  WebContentsWillNavigateEventParams,
  app,
  globalShortcut,
  nativeImage,
  screen,
} from 'electron';
import { join } from 'path';
import { environment } from '../environments/environment';
import { rendererAppPort } from './constants';

const appIcon = join(__dirname, 'assets/app-icon.png');

export default class PostyBirb {
  // Keep a global reference of the window object, if you don't, the window will
  // be closed automatically when the JavaScript object is garbage collected.
  static mainWindow: Electron.BrowserWindow;

  static application: Electron.App;

  static BrowserWindow;

  static appTray: Tray;

  static nestApp: INestApplication;

  public static isDevelopmentMode() {
    return !environment.production;
  }

  private static onWindowAllClosed() {
    if (process.platform !== 'darwin') {
      try {
        if (PostyBirb.appTray) {
          PostyBirb.appTray.destroy();
        }
      } catch {
        // Nothing should disable quitting
      }

      PostyBirb.application.quit();
    }
  }

  private static onClose() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    PostyBirb.mainWindow = null;
  }

  private static onRedirect(
    details: WebContentsWillNavigateEventParams & {
      preventDefault: () => void;
    }
  ) {
    const { url, preventDefault } = details;
    // if (url !== PostyBirb.mainWindow.webContents.getURL()) {
    //   // this is a normal external redirect, open it in a new browser window
    //   preventDefault(); // !BUG - causes a crash in current electron version
    //   shell.openExternal(url);
    // }
  }

  private static onReady() {
    // This method will be called when Electron has finished
    // initialization and is ready to create browser windows.
    // Some APIs can only be used after this event occurs.
    PostyBirb.initAppTray();
    PostyBirb.initMainWindow();
    PostyBirb.loadMainWindow();
  }

  private static onActivate() {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (PostyBirb.mainWindow === null) {
      PostyBirb.onReady();
    }
  }

  private static async onQuit() {
    if (PostyBirb.nestApp) {
      await PostyBirb.nestApp.close();
    }
    process.exit();
  }

  private static initMainWindow() {
    const { workAreaSize } = screen.getPrimaryDisplay();
    const width = Math.min(1280, workAreaSize.width || 1280);
    const height = Math.min(720, workAreaSize.height || 720);

    // Create the browser window.
    PostyBirb.mainWindow = new BrowserWindow({
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
    PostyBirb.mainWindow.setMenu(null);
    PostyBirb.mainWindow.center();

    // if main window is ready to show, close the splash window and show the main window
    PostyBirb.mainWindow.once('ready-to-show', () => {
      PostyBirb.mainWindow.show();

      if (PostyBirb.isDevelopmentMode()) {
        PostyBirb.mainWindow.webContents.openDevTools();
      }
    });

    // Emitted when the window is closed.
    PostyBirb.mainWindow.on('closed', () => {
      PostyBirb.onClose();
    });

    PostyBirb.mainWindow.webContents.on('will-navigate', (details) => {
      PostyBirb.onRedirect(details);
    });
  }

  private static loadMainWindow() {
    // load the index.html of the app.
    if (this.isDevelopmentMode()) {
      PostyBirb.mainWindow.loadURL(`http://localhost:${rendererAppPort}`);
    } else {
      PostyBirb.mainWindow.loadURL(
        `https://localhost:${PostyBirbEnvConfig.port}`
      );
    }
  }

  private static initAppTray() {
    if (!PostyBirb.appTray) {
      const trayItems: Array<
        Electron.MenuItem | Electron.MenuItemConstructorOptions
      > = [
        {
          label: 'Open',
          click() {
            PostyBirb.showMainWindow();
          },
        },
        {
          enabled: !isLinux(),
          label: 'Launch on Startup',
          type: 'checkbox',
          checked: getStartupOptions().startAppOnSystemStartup,
          click(event) {
            const { checked } = event;
            app.setLoginItemSettings({
              openAtLogin: event.checked,
              path: app.getPath('exe'),
            });
            setStartupOptions({
              startAppOnSystemStartup: checked,
            });
          },
        },
        {
          label: 'Quit',
          click() {
            PostyBirb.application.quit();
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
      tray.on('click', () => PostyBirb.showMainWindow());
      onStartupOptionsUpdate(PostyBirb.refreshAppTray);
      PostyBirb.appTray = tray;
    }
  }

  private static refreshAppTray() {
    if (PostyBirb.appTray) {
      PostyBirb.appTray.destroy();
      PostyBirb.appTray = null;
      PostyBirb.initAppTray();
    }
  }

  private static showMainWindow() {
    if (!PostyBirb.mainWindow) {
      PostyBirb.onReady();
    } else {
      if (PostyBirb.mainWindow.isMinimized()) {
        PostyBirb.mainWindow.show();
      }

      PostyBirb.mainWindow.focus();
    }
  }

  static main(electronApp: Electron.App, browserWindow: typeof BrowserWindow) {
    globalShortcut.registerAll(['f5', 'CommandOrControl+R'], () => {
      if (PostyBirb.mainWindow) {
        PostyBirb.mainWindow.reload();
      }
    });

    PostyBirb.BrowserWindow = browserWindow;
    PostyBirb.application = electronApp;

    PostyBirb.application.on('window-all-closed', PostyBirb.onWindowAllClosed); // Quit when all windows are closed.
    PostyBirb.application.on('ready', PostyBirb.onReady); // App is ready to load data
    PostyBirb.application.on('activate', PostyBirb.onActivate); // App is activated
    PostyBirb.application.on('second-instance', () => {
      if (PostyBirb.application.isReady()) {
        PostyBirb.onReady();
      }
    });
    PostyBirb.application.on('quit', PostyBirb.onQuit);

    if (PostyBirb.application.isReady()) {
      PostyBirb.onReady();
    }
  }

  static registerNestApp(nestApp: INestApplication) {
    PostyBirb.nestApp = nestApp;
  }
}
