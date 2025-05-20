/* eslint-disable */
export default {
  displayName: 'postybirb',
  preset: '../../jest.preset.js',
  globals: {},
  transform: {
    '^.+\\.[tj]s$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        isolatedModules: true, // Speeds up test and disables typescript diagnostics report in test
      },
    ],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/apps/postybirb',
  prettierPath: require.resolve('prettier-2'),
};
