const { remote } = require('electron');
const { app } = remote;
const path = require('path');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

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

// Set up profiles DB
const adapter = new FileSync(path.join(app.getPath('userData'), 'data', 'profiles.json'));
const ldb = low(adapter);
window.profilesDB = ldb;
