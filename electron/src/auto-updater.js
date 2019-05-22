const {
  app,
  dialog,
  BrowserWindow
} = require('electron');
const {
  autoUpdater
} = require('electron-updater');
const log = require('electron-log');

autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
autoUpdater.autoDownload = false;
autoUpdater.allowPrerelease = true; // REMOVE WHEN 2.X GOES TO BEING MAIN BUILD!

let updateDialogShowing = false;
let progressWindow = null;

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
        openProgressWindow();
        setTimeout(() => autoUpdater.downloadUpdate(), 1);
      }

      updateDialogShowing = false;
    });

    updateDialogShowing = true;
  }
});

autoUpdater.on('download-progress', (progressObj) => {
  sendStatusToWindow(progressObj.percent);
});


autoUpdater.on('error', (err) => {
  log.error(err);
  sendErrorToWindow(JSON.stringify(err));
});

autoUpdater.on('update-downloaded', (info) => {
  if (progressWindow) {
    progressWindow.close();
    progressWindow = null;
  }

  setTimeout(() => autoUpdater.quitAndInstall(), 1);
});

function openProgressWindow() {
  progressWindow = new BrowserWindow({
    show: true,
    width: 300,
    height: 400,
    resizable: false,
    closable: false,
    movable: true,
    frame: false,
    title: 'PostyBirb'
  });

  progressWindow.loadURL(`file://${__dirname}/html/update-progress.html`);
}

function sendErrorToWindow(error) {
  if (progressWindow) {
    progressWindow.webContents.send('error', error);
  }
}

function sendStatusToWindow(text) {
  if (progressWindow) {
    progressWindow.webContents.send('message', text);
  }
}

module.exports = autoUpdater;
