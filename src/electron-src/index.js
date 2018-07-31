const fs = require('fs');
const path = require('path');
const shell = require('electron').shell;
const clipboard = require('electron').clipboard;

const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const adapter = new FileSync(path.join(require('electron').remote.app.getPath('userData'), 'postybirb.json'));
const db = low(adapter); // DB used for storing compressed or buffer-only images

const _setImmediate = setImmediate;
const _clearImmediate = clearImmediate;
const _Buffer = Buffer;
process.once('loaded', () => {
    global.setImmediate = _setImmediate;
    global.clearImmediate = _clearImmediate;
    global.Buffer = _Buffer;
});

window.db = db;
window.tumblr = require('./js/tumblr-auth.js');
window.twitter = require('./js/twitter-auth.js');
window.deviantart = require('./js/deviantart-auth.js');
window.appVersion = require('electron').remote.app.getVersion();
window.sfw = require('electron').remote.process.env.SFW;
window.nativeImage = require('electron').nativeImage;
window.getFileIcon = require('electron').remote.app.getFileIcon;

window.readFile = function readFile(filePath, successCallback, errorCallback, completeCallback) {
    fs.readFile(filePath, (readErr, buffer) => {
        if (readErr) {
            if (errorCallback) errorCallback(readErr);
            console.error(readErr);
        } else if (successCallback) successCallback(buffer);

        if (completeCallback) completeCallback();
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
