/* eslint-disable */
export default {
  displayName: 'client-server',
  preset: '../../jest.preset.js',
  globals: {},
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/apps/client-server',
  runner: '@kayahr/jest-electron-runner/main',
};
