// @ts-check
const { defineConfig } = require('eslint-define-config');

// Disable this annoying red lines under unformatted code
// if there is prettier extensions installed
let noPrettierExtension = !process.env.VSCODE_CWD;

module.exports = defineConfig({
  root: true,
  ignorePatterns: ['**/*'],
  extends: [
    noPrettierExtension
      ? 'plugin:prettier/recommended'
      : 'eslint-config-prettier',
    'airbnb',
    'airbnb/hooks',
    'airbnb-typescript',
    'plugin:jest/recommended',
    'plugin:testing-library/react',
  ],
  plugins: [
    '@nrwl/nx',
    noPrettierExtension ? 'prettier' : '',
    'formatjs',
    'jest',
    'testing-library',
  ],
  parserOptions: {
    project: './tsconfig.base.json',
  },
  overrides: [
    {
      files: ['*.ts', '*.tsx', '*.js', '*.jsx'],
      rules: {
        ...(noPrettierExtension
          ? {
              'prettier/prettier': [
                'error',
                {
                  endOfLine: 'crlf',
                },
              ],
            }
          : {}),
        '@nrwl/nx/enforce-module-boundaries': [
          'error',
          {
            enforceBuildableLibDependency: true,
            allow: [],
            depConstraints: [
              {
                sourceTag: '*',
                onlyDependOnLibsWithTags: ['*'],
              },
            ],
          },
        ],
      },
    },
    {
      files: ['*.ts', '*.tsx'],
      extends: ['plugin:@nrwl/nx/typescript'],
      rules: {},
    },
    {
      files: ['*.js', '*.jsx'],
      extends: ['plugin:@nrwl/nx/javascript'],
      rules: {},
    },
  ],
  rules: {
    '@typescript-eslint/ban-types': 'warn',
    'class-methods-use-this': 'off',
    'formatjs/no-offset': 'error',
    'import/no-cycle': 'off',
    'import/prefer-default-export': 'off',
    'react/jsx-props-no-spreading': 'off',
    'react/react-in-jsx-scope': 'off',
    'import/no-extraneous-dependencies': 'warn',
  },
});
