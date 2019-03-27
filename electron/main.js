const path = require('path');
const fs = require('fs-extra');
const {
  app,
  BrowserWindow,
  Menu,
  Tray,
  nativeImage,
  powerSaveBlocker,
} = require('electron');
const log = require('electron-log');
const template = require('./src/electron-menu');
const autoUpdater = require('./src/auto-updater');
const windowStateKeeper = require('electron-window-state');

require('electron-context-menu')({
    showInspectElement: false,
});

log.info('Starting PostyBirb...');

let tray = null;
let win = null; // Primary App BrowserWindow
let updateInterval = null; // Interval for checking for updates
let scheduleCheckInterval = null; // Interval for checking for scheduled posts when app is in a closed state
let cacheClearInterval = null; // Interval for manually clearing cache
const userDataPath = app.getPath('userData');
const dataPath = path.join(userDataPath, 'data');
console.log('DataPath', dataPath);

const hasLock = app.requestSingleInstanceLock();
if (!hasLock) {
    app.quit();
    return;
}

app.on('second-instance', () => {
    if (win) {
        win.closeAfterPost = false;
        if (win.isMinimized()) {
            win.restore();
        } else {
            win.show();
        }
        win.focus();
    } else {
        initialize();
    }
});

const blockerId = powerSaveBlocker.start('prevent-app-suspension');

// app.commandLine.appendSwitch('proxy-bypass-list', '*')
// app.commandLine.appendSwitch('proxy-server', 'direct://')
// Create/check for profile file
fs.ensureFileSync(path.join(dataPath, 'profiles.json'));
fs.ensureFileSync(path.join(dataPath, 'templates.json'));
fs.ensureFileSync(path.join(dataPath, 'description-templates.json'));
fs.ensureFileSync(path.join(dataPath, 'settings.json'));
fs.ensureFileSync(path.join(dataPath, 'scheduled-submissions.json'));

const settings = {};
try {
    fs.readJsonSync(path.join(dataPath, 'settings.json'));
} catch (e) {
  // Ignorable - should only ever throw on empty settings file
}

if (settings) {
    if (process.platform == 'win32' || process.platform == 'darwin') {
        if (!settings.hardwareAcceleration) {
            app.disableHardwareAcceleration();
            log.info('Hardware Acceleration is off');
        }
    } else { // Always disable on Linux or other unknown OS
        app.disableHardwareAcceleration();
        log.info('Hardware Acceleration is off');
    }
} else {
    // No settings, just assume to turn off acceleration
    app.disableHardwareAcceleration();
    log.info('Hardware Acceleration is off');
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

    const trayItems = [
        {
            label: 'Open',
            click() {
                createOrOpenNewProfile(PRIMARY_WINDOW_NAME);
            },
        }, {
            label: 'Quit',
            click() {
                try { // Potential to throw error if not initialized intervals
                    clearInterval(cacheClearInterval);
                    clearInterval(updateInterval);
                } catch (e) {
                  // Don't Care
                } finally {
                    app.quit();
                }
            },
        },
    ];

    tray = new Tray(image);
    const trayMenu = Menu.buildFromTemplate(trayItems);

    tray.setContextMenu(trayMenu);
    tray.setToolTip('PostyBirb');
    tray.on('click', () => {
        if (!hasWindows()) {
            initialize();
        } else {
            win.closeAfterPost = false;
            if (win.isMinimized()) {
                win.restore();
            } else {
                win.show();
            }
            win.focus();
        }
    });

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

    win.closeAfterPost = !show;

    if (!process.env.DEVELOP) mainWindowState.manage(win);

    win.webContents.session.clearCache(() => { log.info('Cache cleared')});
    win.loadURL(`file://${__dirname}/dist/index.html`);

    win.on('page-title-updated', e => e.preventDefault()); // Do not allow title changes

    win.on('closed', () => {
        clearInterval(cacheClearInterval);
        win = null;
    });

    win.webContents.once('did-frame-finish-load', () => {
        cacheClearInterval = setInterval(() => {
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

function hasWindows() {
    return BrowserWindow.getAllWindows().filter(b => b.isVisible()).length > 0;
}

function hasScheduled() {
    const data = fs.readJsonSync(path.join(dataPath, 'scheduled-submissions.json'));
    if (data && data.scheduled && data.scheduled.length) {
        scheduleCheckInterval = setInterval(() => {
            log.info('Checking for scheduled submissions...');
            const now = Date.now();
            for (let i = 0; i < data.scheduled.length; i++) {
                if (data.scheduled[i] <= now) {
                    log.info('Opening window to perform post');
                    initialize(false);
                    clearInterval(scheduleCheckInterval);
                    break;
                }
            }
        }, 10000);
        return true;
    }

    return false;
}

/**
 * Close or send app to tray
 */
function attemptToClose() {
    let scheduled = false;
    try {
        scheduled = hasScheduled();
    } catch (e) { /* should be ignorable */}
    if (!scheduled) {
        clearInterval(scheduleCheckInterval);
        powerSaveBlocker.stop(blockerId);
        app.quit();
    }
}
