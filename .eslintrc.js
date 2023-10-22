// @ts-check
const { defineConfig } = require('eslint-define-config');

// Disable this annoying red lines under unformatted code
// if there is prettier extensions installed
let prettierExtension = process.env.VSCODE_CWD;

module.exports = defineConfig({
  root: true,
  ignorePatterns: ['**/*'],
  extends: [
    prettierExtension
      ? 'eslint-config-prettier'
      : 'plugin:prettier/recommended',
    'airbnb',
    'airbnb/hooks',
    'airbnb-typescript',
    'plugin:jest/recommended',
    'plugin:testing-library/react',
  ],
  plugins: [
    '@nrwl/nx',
    prettierExtension ? '' : 'prettier',
    'formatjs',
    'jest',
    'testing-library',
  ].filter(Boolean),
  parserOptions: {
    project: './tsconfig.base.json',
  },
  overrides: [
    {
      files: ['*.ts', '*.tsx', '*.js', '*.jsx'],
      rules: {
        ...(prettierExtension
          ? {}
          : {
              'prettier/prettier': [
                'error',
                {
                  endOfLine: 'crlf',
                },
              ],
            }),
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
