const nxPreset = require('@nrwl/jest/preset');
const { join } = require('path');

const basePath = __dirname.split(/(app|lib)/)[0];

module.exports = {
  ...nxPreset,
  setupFiles: [join(basePath, 'jest.setup.js')],
  verbose: false,
};
