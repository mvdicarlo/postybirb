// Despite the fact that we use @swc/jest babel is still used by jest for instrumenting files with code coverage
// Also by default this config won't load, so we even had to patch jest-coverage
module.exports = {
  presets: ['@nx/react/babel'],
  plugins: [
    ['@babel/plugin-proposal-decorators', { legacy: true }],
    ['@babel/plugin-transform-class-properties', { loose: true }],
  ],
};
