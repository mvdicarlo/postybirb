const path = require('path');
const {
    app,
    BrowserWindow,
    Menu,
    dialog,
} = require('electron');
const windowStateKeeper = require('electron-window-state');

// const { appUpdater } = require('./updater');
const template = require('./electron-menu');

const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
log.info('Starting PostyBirb...');

require('electron-context-menu')({
    showInspectElement: false,
});

let win;
app.disableHardwareAcceleration();

app.on('ready', () => {
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);

    const mainWindowState = windowStateKeeper({
        defaultWidth: 992,
        defaultHeight: 800,
    });

    win = new BrowserWindow({
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

    mainWindowState.manage(win);

    win.loadURL(`file://${__dirname}/dist/index.html`);

    win.on('page-title-updated', (e) => {
        e.preventDefault();
    });

    win.on('closed', () => {
        win = null;
    });

    win.webContents.on('did-fail-load', () => {
        win.loadURL(`file://${__dirname}/dist/index.html`);
    });

    win.webContents.once('did-frame-finish-load', () => {
        if (!process.env.DEVELOP) {
            setInterval(() => autoUpdater.checkForUpdatesAndNotify(), 60 * 60000);
            autoUpdater.checkForUpdatesAndNotify();
        }

        setInterval(() => {
            win.webContents.session.getCacheSize((size) => {
                if (size > 0) {
                    if (Boolean(process.env.DEVELOP)) log.info(`Clearing Cache (${size})`);
                    win.webContents.session.clearCache(() => {});
                }
            });
        }, 10000);
    });
});

app.on('uncaughtException', (err) => {
    log.error(err);
});

process.on('uncaughtException', (err) => {
    log.error(err);
});

app.on('window-all-closed', () => {
    app.quit();
});

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
    log.info(info);
});

autoUpdater.on('error', (err) => {
    log.error(err);
});

autoUpdater.on('update-downloaded', (info) => {
    let message = `${app.getName()} ${info.version} is now available. It will be installed the next time you restart the application.`;
    if (info.releaseNotes) {
        const splitNotes = info.releaseNotes.replace(/(<\w*>|<\/\w*>)/gm, '');
        message += `\n\nRelease notes:\n${splitNotes}`;
    }

    dialog.showMessageBox({
        type: 'question',
        buttons: ['Install and Relaunch', 'Later'],
        defaultId: 0,
        message: `A new version of ${app.getName()} has been downloaded`,
        detail: message,
    }, (response) => {
        if (response === 0) {
            setTimeout(() => autoUpdater.quitAndInstall(), 1);
        }
    });
});
