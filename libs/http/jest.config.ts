/* eslint-disable */
export default {
  displayName: 'http',
  preset: '../../jest.preset.js',
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.spec.json',
    },
  },
  transform: {
    '^.+\\.[tj]sx?$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '../../coverage/libs/http',
  runner: '@kayahr/jest-electron-runner/main',
  testEnvironment: 'node',
  verbose: false,
};
