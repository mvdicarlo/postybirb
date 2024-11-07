/* eslint-disable */
export default {
  prettierPath: null,
  displayName: 'form-builder',
  preset: '../../jest.preset.js',
  globals: {},
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
      },
    ],
  },
  moduleFileExtensions: ['js', 'ts', 'html'],
  coverageDirectory: '../../coverage/libs/form-builder',
};
