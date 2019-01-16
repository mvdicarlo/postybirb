const fs = require('fs');
const path = require('path');
const electron = require('electron');
const uniqid = require('uniqid');

const shell = electron.shell;
const clipboard = electron.clipboard;

const _setImmediate = setImmediate;
const _clearImmediate = clearImmediate;
const _Buffer = Buffer;
process.once('loaded', () => {
    global.setImmediate = _setImmediate;
    global.clearImmediate = _clearImmediate;
    global.Buffer = _Buffer;
});

const cookieSolutions = require('./js/cookie-solutions.js');
window.tumblr = require('./js/tumblr-auth.js');
window.twitter = require('./js/twitter-auth.js');
window.deviantart = require('./js/deviantart-auth.js');
window.mastodon = require('./js/mastodon-auth.js');
window.aryion = require('./js/aryion-post.js');
window.amino = require('./js/furry-amino-post.js');
window.newgrounds = require('./js/newgrounds-post.js');
window.requestpost = require('./js/request-post.js');

window.appVersion = electron.remote.app.getVersion();
window.getPath = electron.remote.app.getPath;
window.sfw = electron.remote.process.env.SFW;
window.fakePosts = electron.remote.process.env.FAKEPOSTS;
window.nativeImage = electron.nativeImage;
window.getFileIcon = electron.remote.app.getFileIcon;
window.immediatelyCheckForScheduled = electron.remote.getCurrentWindow().immediatelyCheckForScheduled;
window.db = electron.remote.getCurrentWindow().db; // db is now in the main process to reduce chance of json corruption by being closed during write
window.logdb = electron.remote.getCurrentWindow().logdb; // db is now in the main process to reduce chance of json corruption by being closed during write
window.browserwindow = electron.remote.BrowserWindow;
window.relaunch = function relaunch() {
    electron.remote.app.relaunch();
    electron.remote.app.exit();
};

window.getPartition = function getPartition() {
  const partition = electron.remote.getCurrentWindow().partition;
  if (partition) {
    return `persist:${partition}`;
  }

  return null;
}

window.tempMap = {}; // temporary file map

const profilesDB = electron.remote.getCurrentWindow().profilesdb;
window.getAppProfiles = function getAppProfiles() {
  return profilesDB.get('profiles').value() || [];
}

const ipc = electron.ipcRenderer;
window.addOrOpenAppProfile = function addOrOpenAppProfile(profile) {
  if (profile) {
    ipc.send('open-profile', profile);
  }
}

window.removeAppProfile = function removeAppProfile(profile) {
  if (profile) {
    ipc.send('remove-profile', profile);
  }
}

window.readFile = function readFile(filePath, successCallback, errorCallback, completeCallback) {
    fs.readFile(filePath, (readErr, buffer) => {
        if (readErr) {
            if (errorCallback) errorCallback(readErr);
            console.error(readErr);
        } else if (successCallback) successCallback(buffer);

        if (completeCallback) completeCallback();
    });
};

window.storeTemporaryFile = function (buffer, name) {
    return new Promise((resolve, reject) => {
        if (name && buffer) {
          checkOrCreateTempDir()
          .then(() => {
            if (window.tempMap[name]) {
              resolve(window.tempMap[name]);
              return;
            }

            const id = uniqid();
            const p = path.join(getPath('temp'), 'PostyBirb', id);
            fs.writeFile(p, buffer, ((e) => {
              window.tempMap[name] = id;
                e ? reject() : resolve(p);
            }));
          })
          .catch(() => reject());
        } else {
            reject();
        }
    });
};

function checkOrCreateTempDir() {
  return new Promise((resolve, reject) => {
    fs.stat(path.join(getPath('temp'), 'PostyBirb'), (err, stats) => {
      if (err) {
        fs.mkdir(path.join(getPath('temp'), 'PostyBirb'), (err) => {
           resolve();
        });
      } else {
        resolve();
      }
    });
  });
}

window.temporaryFileExists = function (name) {
    return new Promise((resolve, reject) => {
      const id = window.tempMap[name];
      const p = path.join(getPath('temp'), 'PostyBirb', id);
      fs.access(p, fs.constants.F_OK, (err) => {
          err ? reject() : resolve(p);
      });
    });
};

window.openUrlInBrowser = function openUrl(url) {
    shell.openExternal(url);
};

window.getClipboardContents = function readClipboard() {
    return { availableFormats: clipboard.availableFormats(), content: clipboard.readImage() };
};

window.getClipboardFormats = function getClipboardFormats() {
    return clipboard.availableFormats();
};
