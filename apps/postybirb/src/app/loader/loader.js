const { BrowserWindow } = require('electron');
const path = require('path');

const height = 350;
const width = 300;

let window = null;

function show() {
  if (window) {
    if (window.isMinimized()) {
      window.restore();
    }
    window.show();
    window.focus();
  } else {
    window = new BrowserWindow({
      show: false,
      alwaysOnTop: true,
      resizable: false,
      frame: false,
      closable: false,
      width,
      height,
      title: 'PostyBirb',
      center: true,
    });

    window
      .loadFile(path.join(__dirname, 'app', 'loader', 'loader.html'))
      .then(() => (window ? window.show() : undefined));
    window.webContents.on('new-window', (event) => event.preventDefault());
    window.on('closed', () => {
      if (window) {
        window.destroy();
        window = null;
      }
    });
  }
}

function hide() {
  if (window) {
    window.destroy();
    window = null;
  }
}

module.exports.show = show;
module.exports.hide = hide;
