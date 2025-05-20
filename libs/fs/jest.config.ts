/* eslint-disable */
export default {
  displayName: 'fs',
  preset: '../../jest.preset.js',
  globals: {},
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]sx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        isolatedModules: true, // Speeds up test and disables typescript diagnostics report in test
      },
    ],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '../../coverage/libs/fs',
  runner: '@kayahr/jest-electron-runner/main',
  prettierPath: require.resolve('prettier-2'),
};
