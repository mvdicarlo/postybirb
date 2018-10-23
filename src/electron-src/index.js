const fs = require('fs');
const path = require('path');
const electron = require('electron');

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

window.tumblr = require('./js/tumblr-auth.js');
window.twitter = require('./js/twitter-auth.js');
window.deviantart = require('./js/deviantart-auth.js');
window.mastodon = require('./js/mastodon-auth.js');
window.aryion = require('./js/aryion-post.js');

window.appVersion = electron.remote.app.getVersion();
window.sfw = electron.remote.process.env.SFW;
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
