const fs = require('fs');
const path = require('path');
const {
    app,
    BrowserWindow,
    Menu,
    Tray,
    nativeImage,
    ipcMain,
} = require('electron');
const rimraf = require('rimraf');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const template = require('./src/electron-menu');
const autoUpdater = require('./src/auto-updater');
const PostyBirbWindow = require('./postybirb-window');

const log = require('electron-log');

log.info('Starting PostyBirb...');

require('electron-context-menu')({
    showInspectElement: false,
});

const PRIMARY_WINDOW_NAME = 'postybirb';
const profileWindows = {};
const dbStore = {}; // store of all dbs for lookup

let tray = null;
let scheduledInterval = null;
let adapter = null;

const hasLock = app.requestSingleInstanceLock();
if (!hasLock) {
    app.quit();
    return;
}
app.on('second-instance', () => {
    const win = profileWindows[PRIMARY_WINDOW_NAME];
    if (win) {
        if (win.isMinimized()) {
            win.restore();
        }

        win.focus();
    } else if (tray) {
        createOrOpenNewProfile(PRIMARY_WINDOW_NAME);
    }
});

const postybirbProfilesdb = createDB('profiles'); // stored list of created profiles

function createDB(name) {
    let ldb = null;
    if (dbStore[name]) {
        ldb = dbStore[name];
    } else {
        const fileName = `${name}.json`;
        try {
            adapter = new FileSync(path.join(app.getPath('userData'), fileName));
            ldb = low(adapter);
        } catch (e) {
            try {
                fs.unlinkSync(path.join(app.getPath('userData'), fileName));
            } catch (e) {
          // nothing
            }
            adapter = new FileSync(path.join(app.getPath('userData'), fileName));
            ldb = low(adapter);
        }
        dbStore[name] = ldb;
    }

    return ldb;
}

function hardwareAccelerationState() {
    const enabled = createDB('postybirb').get('hardwareAcceleration').value();
    const isEnabled = enabled === undefined ? false : enabled;
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

// these two commands need to be checked for removal on electron 3.1.0+
// app.commandLine.appendSwitch('auto-detect', 'false');
app.commandLine.appendSwitch('no-proxy-server');
app.commandLine.appendSwitch('proxy-server', 'direct://');
app.commandLine.appendSwitch('proxy-bypass-list', '*');

app.on('ready', () => {
    const profileMenu = {
        label: 'Profile',
        submenu:
            getAllProfiles().map(profile => ({
                label: profile,
                type: 'normal',
                click() { createOrOpenNewProfile(profile) },
            })),
    };

    const menu = Menu.buildFromTemplate([profileMenu, ...template]);

    Menu.setApplicationMenu(menu);
    createOrOpenNewProfile(PRIMARY_WINDOW_NAME);

    let image = nativeImage.createFromPath(path.join(__dirname, '/dist/assets/icon/minnowicon.png'));
    if (process.platform === 'darwin') image = image.resize({ width: 16, height: 16 });
    image.setTemplateImage(true);

    const trayItems = [
        {
            label: 'Open',
            click() {
                createOrOpenNewProfile(PRIMARY_WINDOW_NAME);
            },
        }, {
            label: 'Profiles',
            submenu: getAllProfiles().filter(profile => profile !== PRIMARY_WINDOW_NAME).map(profile => ({
                label: profile,
                click() {
                    createOrOpenNewProfile(profile);
                },
            })),
        }, {
            label: 'Quit',
            click() {
                clearInterval(scheduledInterval);
                rimraf(path.join(app.getPath('temp'), 'PostyBirb'), () => {
                    app.quit();
                });
            },
        },
    ];

    tray = new Tray(image);
    const trayMenu = Menu.buildFromTemplate(trayItems);

    tray.setContextMenu(trayMenu);
    tray.setToolTip('PostyBirb');
    tray.on('click', () => {
        if (!hasWindows()) {
            createOrOpenNewProfile(PRIMARY_WINDOW_NAME);
        } else {
            createOrOpenNewProfile(PRIMARY_WINDOW_NAME);
        }
    });

    ipcMain.on('open-profile', (event, profile) => {
        if (profile && profile !== 'profiles') { // do not allow one to be created that is named profile
            profile = profile.toLowerCase();
            createOrOpenNewProfile(profile);
        }
    });

    ipcMain.on('remove-profile', (event, profile) => {
      if (profile && profile !== 'postybirb') {
        removeProfile(profile);
      }
    });

    scheduledInterval = setInterval(checkForScheduledPost, 2 * 60000);

    if (!process.env.DEVELOP) {
      const enabled = createDB('postybirb').get('autoUpdate').value();
      const isEnabled = enabled === undefined ? true : enabled;
      if (enabled === undefined || enabled === true) {
          autoUpdater.checkForUpdates();
      }
    }
});

function createOrOpenNewProfile(name, show = true, openForScheduled = false) {
    if (!profileWindows[name]) {
        addProfileToProfileDB(name);
        const profileDb = createDB(name == PRIMARY_WINDOW_NAME ? PRIMARY_WINDOW_NAME : `${name}`); // try to keep postybirb.json unique
        const profileLogDb = createDB(`${name}-logs`);
        profileWindows[name] = new PostyBirbWindow(profileDb, profileLogDb, postybirbProfilesdb).initialize(name, show, openForScheduled);
        profileWindows[name].on('closed', () => {
            delete profileWindows[name];
            if (!Object.keys(profileWindows).length) {
                attemptToClose();
            }
        });
    } else if (openForScheduled) {
        profileWindows[name].showInactive();
    } else {
        const win = profileWindows[name];
        if (win.isMinimized()) {
            win.restore();
        } else {
            win.show();
        }
        win.focus();
    }
}

function getAllProfiles() {
    return postybirbProfilesdb.get('profiles').value() || [];
}

function addProfileToProfileDB(name) {
    if (name) name = name.toLowerCase();
    const profiles = getAllProfiles();
    if (!profiles.includes(name)) {
        profiles.push(name);
        postybirbProfilesdb.set('profiles', profiles.sort()).write();
    }
}

function removeProfile(name) {
  const profiles = getAllProfiles();
  const index = profiles.indexOf(name);
  if (index !== -1) {
    profiles.splice(index, 1);
    postybirbProfilesdb.set('profiles', profiles.sort()).write();

    fs.unlink(path.join(app.getPath('userData'), `${name}.json`), (err) => {
      if (err) log.error(err);
    });

    fs.unlink(path.join(app.getPath('userData'), `${name}-logs.json`), (err) => {
      if (err) log.error(err);
    });
  }
}

function checkForScheduledPost() {
    log.info('Checking for scheduled posts...');
    [...getAllProfiles()].forEach(profile => checkForScheduledToPost(profile));
}

function checkForScheduledToPost(name) {
    log.info(`Checking for scheduled posts in ${name}`);
    const now = Date.now();
    const state = createDB(name).get('PostyBirbState').value();

    try {
        if (state && state.submissions) {
            for (let i = 0; i < state.submissions.length; i++) {
                const s = state.submissions[i];
                if (s.meta.schedule) {
                    const scheduledTime = new Date(s.meta.schedule).getTime();
                    if (scheduledTime - now <= 0) {
                        createOrOpenNewProfile(name, false, true);
                        return;
                    }
                }
            }
        }
    } catch (e) {
        log.error(e);
    }

    log.info(`No scheduled posts found in ${name}`);
}

function hasWindows() {
    return BrowserWindow.getAllWindows().filter(b => b.isVisible()).length > 0;
}

function hasScheduled() {
    const profiles = [...getAllProfiles()];
    for (let i = 0; i < profiles.length; i++) {
        if (checkForScheduled(profiles[i])) {
            return true;
        }
    }

    return false;
}

function checkForScheduled(name) {
    const state = createDB(name).get('PostyBirbState').value();
    try {
        if (state.submissions) {
            for (let i = 0; i < state.submissions.length; i++) {
                const submission = state.submissions[i];
                if (submission.meta.schedule) {
                    return true;
                }
            }
        }
    } catch (e) { /* Skip */ }


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
        rimraf(path.join(app.getPath('temp'), 'PostyBirb'), () => {
            app.quit();
        });
    } else {
        tray.displayBalloon({
            title: 'Scheduled Submissions',
            icon: path.join(__dirname, '/dist/assets/icon/minnowicon.png'),
            content: 'PostyBirb will continue to run while there are scheduled submission. Close the app from the system tray to fully quit PostyBirb.',
        });
    }
}
