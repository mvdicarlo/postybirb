const fs = require('fs');
const shell = require('electron').shell;
const clipboard = require('electron').clipboard;

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
window.appVersion = require('electron').remote.app.getVersion();
window.documentsPath = require('electron').remote.app.getPath('documents');
window.sfw = require('electron').remote.process.env.SFW;

// Set up generic Documents folder - DEPRECATED
// fs.access(`${window.documentsPath}/PostyBirb`, fs.constants.F_OK, (err) => {
//     if (err) {
//         fs.mkdir(`${window.documentsPath}/PostyBirb`, (err) => {
//             if (err) {
//                 console.error('Unable to create Documents subfolder');
//             } else {
//                 fs.mkdir(`${window.documentsPath}/PostyBirb/temp`, (err) => {
//                     if (err) {
//                         console.error('Unable to create Documents subfolder: temp');
//                     }
//                 });
//             }
//         });
//     } else {
//         fs.access(`${window.documentsPath}/PostyBirb/temp`, fs.constants.F_OK, (err) => {
//             if (err) {
//                 fs.mkdir(`${window.documentsPath}/PostyBirb/temp`, (err) => {
//                     if (err) {
//                         console.error('Unable to create Documents subfolder: temp');
//                     }
//                 });
//             }
//         });
//     }
// });

/**
 * These functions are used to limit what can be called from the app itself
 */

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
