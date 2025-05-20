/* eslint-disable */
export default {
  displayName: 'logger',
  preset: '../../jest.preset.js',
  globals: {},
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]sx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
      },
    ],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '../../coverage/libs/logger',
  runner: '@kayahr/jest-electron-runner/main',
  prettierPath: require.resolve('prettier-2'),
};
