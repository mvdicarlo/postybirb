/* eslint-disable */
export default {
  displayName: 'form-builder',
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
  moduleFileExtensions: ['ts', 'js', 'tsx', 'jsx'],
  coverageDirectory: '../../coverage/apps/client-server'
};
