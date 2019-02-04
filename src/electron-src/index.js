const { remote, nativeImage, shell, clipboard } = require('electron');
const path = require('path');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const { app, session } = remote;

// Loads these behaviors into browser (unsure if this is required anymore)
const _setImmediate = setImmediate;
const _clearImmediate = clearImmediate;
const _Buffer = Buffer;
process.once('loaded', () => {
    global.setImmediate = _setImmediate;
    global.clearImmediate = _clearImmediate;
    global.Buffer = _Buffer;
});

window.appVersion = remote.app.getVersion();
window.nativeImage = nativeImage;
window.getFileIcon = app.getFileIcon;

// Set up profiles DB
const adapter = new FileSync(path.join(app.getPath('userData'), 'data', 'profiles.json'));
const ldb = low(adapter);
window.profilesDB = ldb;

// Set up description templates DB
const descriptionAdapter = new FileSync(path.join(app.getPath('userData'), 'data', 'description-templates.json'));
const dldb = low(descriptionAdapter);
window.descriptionTemplateDB = dldb;

window.got = require('./src/got-request.js');

/**
 * Opens a url in the user's native/default browser
 * @param  {string} url URL being opened
 */
window.openUrlInBrowser = function openUrl(url) {
    shell.openExternal(url);
};

/**
 * Gets cookies for session given a url and persist id
 * @param  {string} persistId
 * @param  {string} url
 * @return {Promise<Cookie[]>}     Cookies
 */
window.getCookies = function getCookies(persistId, url) {
    const cookies = session.fromPartition(`persist:${persistId}`).cookies;
    return new Promise((resolve, reject) => {
        cookies.get({ url }, (error, cookies) => {
            error ? reject(error) : resolve(cookies);
        });
    });
};

window.getClipboardFormats = clipboard.availableFormats;
window.writeToClipboard = clipboard.write;
window.readClipboard = function readClipboard() {
    return { availableFormats: clipboard.availableFormats(), content: clipboard.readImage() };
};
