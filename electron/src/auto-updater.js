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

autoUpdater.on('checking-for-update', () => {
  // log.info('Checking for update...');
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
  app.removeAllListeners('window-all-closed');

  if (progressWindow) {
    progressWindow.setClosable(true);
    progressWindow.destroy();
    progressWindow = null;
  }
  BrowserWindow.getAllWindows().forEach(w => {
    w.destroy();
  });

  setTimeout(() => autoUpdater.quitAndInstall(false, true), 1000);
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

module.exports = { autoUpdater };
