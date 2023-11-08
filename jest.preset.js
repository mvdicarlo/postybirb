const nxPreset = require('@nx/jest/preset').default;

const { join } = require('path');

const basePath = __dirname.split(/(app|lib)/)[0];

module.exports = {
  ...nxPreset,
  setupFiles: [join(basePath, 'jest.setup.ts')],
  verbose: false,
};
