const { remote } = require('electron');

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
