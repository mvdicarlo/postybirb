const fs = require('fs');
const path = require('path');
const {
    app,
    BrowserWindow,
    Menu,
    dialog,
    Tray,
    nativeImage,
} = require('electron');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const windowStateKeeper = require('electron-window-state');

const template = require('./electron-menu');

const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
autoUpdater.autoDownload = false;
log.info('Starting PostyBirb...');

require('electron-context-menu')({
    showInspectElement: false,
});

let win = null;
let tray = null;
let clearCacheInterval = null;
let updateInterval = null;
let scheduledInterval = null;
let adapter = null;
let updateDialogShowing = false;

const hasLock = app.requestSingleInstanceLock();
if (!hasLock) {
    app.quit();
    return;
}
app.on('second-instance', () => {
    if (win) {
        if (win.isMinimized()) {
            win.restore();
        }

        win.focus();
    } else if (tray) {
        initialize();
    }
});


const db = createDB('postybirb.json');
const logdb = createDB('logs.json');

function createDB(name) {
    let ldb = null;
    try {
        adapter = new FileSync(path.join(app.getPath('userData'), name));
        ldb = low(adapter);
    } catch (e) {
        try {
            fs.unlinkSync(path.join(app.getPath('userData'), name));
        } catch (e) {
        // nothing
        }
        adapter = new FileSync(path.join(app.getPath('userData'), name));
        ldb = low(adapter);
    }

    return ldb;
}

function hardwareAccelerationState() {
    const enabled = db.get('hardwareAcceleration').value();
    const isEnabled = enabled === undefined ? true : enabled;
    if (!isEnabled) {
        app.disableHardwareAcceleration();
    }

    log.info(`Hardware Acceleration is ${isEnabled ? 'ON' : 'OFF'}`);
}

if (process.platform == 'win32' || process.platform == 'darwin') {
    hardwareAccelerationState();
} else {
    app.disableHardwareAcceleration();
}

app.commandLine.appendSwitch('auto-detect', 'false');

app.on('ready', () => {
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
    initialize();

    let image = nativeImage.createFromPath(path.join(__dirname, '/dist/assets/icon/minnowicon.png'));
    if (process.platform === 'darwin') image = image.resize({ width: 16, height: 16 });
    image.setTemplateImage(true);

    tray = new Tray(image);
    const trayMenu = Menu.buildFromTemplate([
        {
            label: 'Open',
            type: 'radio',
            checked: false,
            click() {
                if (!hasWindows()) {
                    initialize();
                } else {
                    win.show();
                }
            },
        }, {
            label: 'Quit',
            type: 'radio',
            checked: false,
            click() {
                clearInterval(scheduledInterval);
                clearInterval(clearCacheInterval);
                clearInterval(updateInterval);
                app.quit();
            },
        },
    ]);

    tray.setContextMenu(trayMenu);
    tray.setToolTip('PostyBirb');
    tray.on('click', () => {
        if (!hasWindows()) {
            initialize();
        } else {
            win.show();
        }
    });
});

function initialize(show = true, openForScheduled = false) {
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
        title: 'Posty Birb',
        webPreferences: {
            devTools: Boolean(process.env.DEVELOP),
            allowRunningInsecureContent: false,
            nodeIntegration: false,
            preload: `${__dirname}/dist/electron-src/index.js`,
            webviewTag: true,
        },
    });

    if (!process.env.DEVELOP) mainWindowState.manage(win);

    win.immediatelyCheckForScheduled = openForScheduled;

    win.db = db;
    win.logdb = logdb;

    win.on('ready-to-show', () => {
        if (openForScheduled) {
            win.showInactive();
        }
    });

    win.loadURL(`file://${__dirname}/dist/index.html`);

    win.on('page-title-updated', (e) => {
        e.preventDefault();
    });

    win.on('closed', () => {
        win = null;
        clearInterval(clearCacheInterval);
        clearInterval(updateInterval);

        attemptToClose();
    });

    win.webContents.on('did-fail-load', () => {
        win.loadURL(`file://${__dirname}/dist/index.html`);
    });

    win.webContents.once('did-frame-finish-load', () => {
        clearCacheInterval = setInterval(() => {
            win.webContents.session.getCacheSize((size) => {
                if (size > 0) {
                    if (process.env.DEVELOP) log.info(`Clearing Cache (${size})`);
                    win.webContents.session.clearCache(() => {});
                }
            });
        }, 10000);
    });

    if (!process.env.DEVELOP) {
        updateInterval = setInterval(() => {
            autoUpdater.checkForUpdates();
        }, 3 * 60 * 60000);

        autoUpdater.checkForUpdates();
    }

    return win;
}

function checkForScheduledPost() {
    if (hasWindows()) return;

    log.info('Checking for scheduled posts...');

    fs.readFile(path.join(app.getPath('userData'), 'postybirb.json'), (err, data) => {
        if (err) {
            log.error(err);
        } else {
            try {
                const config = JSON.parse(data);
                const now = Date.now();
                const submissions = config.PostyBirbState.submissions || [];
                for (let i = 0; i < submissions.length; i++) {
                    const s = submissions[i];
                    if (s.meta.schedule) {
                        const scheduledTime = new Date(s.meta.schedule).getTime();
                        if (scheduledTime - now <= 0) {
                            initialize(false, true);
                            return;
                        }
                    }
                }

                log.info('No schedule posts scheduled soon.');
            } catch (e) {
                log.error(e);
            }
        }
    });
}

function hasWindows() {
    return BrowserWindow.getAllWindows().filter(b => b.isVisible()).length > 0;
}

function hasScheduled() {
    const state = db.get('PostyBirbState').value() || {};
    if (state.submissions) {
        for (let i = 0; i < state.submissions.length; i++) {
            const submission = state.submissions[i];
            if (submission.meta.schedule) {
                return true;
            }
        }
    }

    return false;
}

app.on('uncaughtException', (err) => {
    log.error(err);
});

process.on('uncaughtException', (err) => {
    log.error(err);
});

app.on('window-all-closed', () => {
    attemptToClose();
});

function attemptToClose() {
    if (!hasScheduled()) {
        app.quit();
    } else {
        scheduledInterval = setInterval(checkForScheduledPost, 2 * 60000);
        tray.displayBalloon({
            title: 'Scheduled Submissions',
            icon: path.join(__dirname, '/dist/assets/icon/minnowicon.png'),
            content: 'PostyBirb will continue to run while there are scheduled submission. Close the app from the system tray to fully quit PostyBirb.',
        });
    }
}

// For details about these events, see the Wiki:
// https://github.com/electron-userland/electron-builder/wiki/Auto-Update#events
//
// The app doesn't need to listen to any events except `update-downloaded`
//
// Uncomment any of the below events to listen for them.  Also,
// look in the previous section to see them being used.
//-------------------------------------------------------------------

autoUpdater.on('checking-for-update', () => {
    log.info('Checking for update...');
});

autoUpdater.on('update-available', (info) => {
    if (!updateDialogShowing) {
        let message = `${app.getName()} ${info.version} is now available.`;
        if (info.releaseNotes) {
            const splitNotes = info.releaseNotes.replace(/(<\w*>|<\/\w*>)/gm, '');
            message += `\n\nRelease notes:\n${splitNotes}`;
        }

        dialog.showMessageBox({
            type: 'question',
            buttons: ['Install and Relaunch', 'Later'],
            defaultId: 0,
            message,
        }, (response) => {
            if (response === 0) {
                setTimeout(() => autoUpdater.downloadUpdate(), 1);
            }

            updateDialogShowing = false;
        });

        updateDialogShowing = true;
    }
});

autoUpdater.on('error', (err) => {
    log.error(err);
});

autoUpdater.on('update-downloaded', (info) => {
    setTimeout(() => autoUpdater.quitAndInstall(), 1);
});
