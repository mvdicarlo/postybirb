const path = require('path');
const fs = require('fs-extra');
const {
  app,
  BrowserWindow,
  Menu,
  Tray,
  nativeImage,
} = require('electron');
const log = require('electron-log');
const template = require('./src/electron-menu');
const autoUpdater = require('./src/auto-updater');
const windowStateKeeper = require('electron-window-state');

require('electron-context-menu')({
    showInspectElement: false,
});

log.info('Starting PostyBirb...');

let win = null; // Primary App BrowserWindow
let updateInterval = null; // Interval for checking for updates
const clearCacheInterval = null; // Interval for manually clearing cache
const userDataPath = app.getPath('userData');
const dataPath = path.join(userDataPath, 'data');

const hasLock = app.requestSingleInstanceLock();
if (!hasLock) {
    app.quit();
    return;
}

app.on('second-instance', () => {
    if (win) {
        if (win.isMinimized()) win.restore();
        win.focus();
    } else {
        initialize();
    }
});

// app.commandLine.appendSwitch('proxy-bypass-list', '*')
// app.commandLine.appendSwitch('proxy-server', 'direct://')
// Create/check for profile file
fs.ensureFileSync(path.join(dataPath, 'profiles.json'));
fs.ensureFileSync(path.join(dataPath, 'description-templates.json'));
fs.ensureFileSync(path.join(dataPath, 'settings.json'));

const settings = fs.readJsonSync(path.join(dataPath, 'settings.json'));
if (settings) {
    if (process.platform == 'win32' || process.platform == 'darwin') {
        if (!settings.hardwareAcceleration) {
            app.disableHardwareAcceleration();
            log.info(`Hardware Acceleration is off`);
        }
    } else { // Always disable on Linux or other unknown OS
        app.disableHardwareAcceleration();
        log.info(`Hardware Acceleration is off`);
    }
} else {
    // No settings, just assume to turn off acceleration
    app.disableHardwareAcceleration();
    log.info(`Hardware Acceleration is off`);
}

app.on('ready', () => {
    log.info('PostyBirb Ready...');

  // Set Menu Items
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);

  // Set Application Icon
    let image = nativeImage.createFromPath(path.join(__dirname, '/dist/assets/icon/minnowicon.png'));
    if (process.platform === 'darwin') {
        image = image.resize({
            width: 16,
            height: 16,
        });
    }
    image.setTemplateImage(true);

  // TODO tray items

    if (!process.env.DEVELOP) {
        updateInterval = setInterval(() => {
            autoUpdater.checkForUpdates();
        }, 3 * 60 * 60000);
    }

    initialize();
});

/**
 * Initializes Application Window
 * @param  {Boolean} [show=true] If the application will be visible
 */
function initialize(show = true) {
    const mainWindowState = windowStateKeeper({
        defaultWidth: 992,
        defaultHeight: 800,
    });

    win = new BrowserWindow({
        show,
        width: mainWindowState.width,
        minWidth: 500,
        height: mainWindowState.height,
        minHeight: 500,
        autoHideMenuBar: true,
        icon: path.join(__dirname, '/dist/assets/icon/minnowicon.png'),
        title: 'PostyBirb',
        webPreferences: {
            devTools: !!process.env.DEVELOP,
            allowRunningInsecureContent: false,
            nodeIntegration: false,
            preload: path.join(__dirname, 'dist', 'electron-src', 'index.js'),
            webviewTag: true,
        },
    });

    if (!process.env.DEVELOP) mainWindowState.manage(win);

    win.on('ready-to-show', () => {
    // TODO stub for schedule
    });

    win.loadURL(`file://${__dirname}/dist/index.html`);

    win.on('page-title-updated', e => e.preventDefault()); // Do not allow title changes

    win.on('closed', () => {
        clearInterval(cacheClearInterval);
        win = null;
    });

    win.webContents.once('did-frame-finish-load', () => {
        this.cacheClearInterval = setInterval(() => {
            win.webContents.session.clearCache(() => {});
        }, 60000);
    });
}

/**
 * Application and Process Events
 */

app.on('uncaughtException', (err) => {
    log.error(err);
});

process.on('uncaughtException', (err) => {
    log.error(err);
});

app.on('window-all-closed', () => {
    attemptToClose();
});

/**
 * Stub function for later use with schedule checking
 */
function attemptToClose() {
    app.quit();
}
