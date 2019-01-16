const fs = require('fs');
const path = require('path');
const {
    BrowserWindow,
} = require('electron');
const windowStateKeeper = require('electron-window-state');

module.exports = class PostyBirbWindow {
  constructor(db, logdb, profilesdb) {
    this.win = null;
    this.db = db;
    this.logdb = logdb;
    this.profilesdb = profilesdb;
    this.clearCacheInterval = null;
  }

  getWindow() {
    return this.win;
  }

  show() {
    this.win.show();
  }

  showInactive() {
    this.win.showInactive();
  }

  initialize(partition = null, show = true, openForScheduled = false) {
    const mainWindowState = windowStateKeeper({
        defaultWidth: 992,
        defaultHeight: 800,
    });

    if (partition == 'postybirb') partition = null; // protect primary

    let win = new BrowserWindow({
        show,
        width: mainWindowState.width,
        minWidth: 500,
        height: mainWindowState.height,
        minHeight: 500,
        autoHideMenuBar: true,
        icon: path.join(__dirname, '/dist/assets/icon/minnowicon.png'),
        title: `Posty Birb${ partition ? ' - ' + partition : ''}`,
        webPreferences: {
            devTools: process.env.DEVELOP === 'true',
            allowRunningInsecureContent: false,
            nodeIntegration: false,
            preload: `${__dirname}/dist/electron-src/index.js`,
            webviewTag: true,
            partition: partition ? 'persist:' + partition : null,
        },
    });

    if (!process.env.DEVELOP) mainWindowState.manage(win);

    win.immediatelyCheckForScheduled = openForScheduled;

    win.db = this.db;
    win.logdb = this.logdb;
    win.profilesdb = this.profilesdb;
    win.partition = partition;

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
        clearInterval(this.clearCacheInterval);
        this.win = null;
    });

    win.webContents.on('did-fail-load', () => {
        win.loadURL(`file://${__dirname}/dist/index.html`);
    });

    win.webContents.once('did-frame-finish-load', () => {
        this.clearCacheInterval = setInterval(() => {
            win.webContents.session.getCacheSize((size) => {
                if (size > 0) {
                    win.webContents.session.clearCache(() => {});
                }
            });
        }, 10000);
    });

    this.win = win;
    return win;
  }
}
