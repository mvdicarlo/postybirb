/* eslint-disable */
export default {
  displayName: 'http',
  preset: '../../jest.preset.js',
  globals: {},
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '../../coverage/libs/http',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^electron$': '<rootDir>/src/__mocks__/electron.js',
  },
};
