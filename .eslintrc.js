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
    'lingui',
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
    'import/no-cycle': 'off',
    'import/prefer-default-export': 'off',
    'react/jsx-props-no-spreading': 'off',
    'react/react-in-jsx-scope': 'off',
    'import/no-extraneous-dependencies': 'warn',

    'lingui/no-unlocalized-strings': 'error',
    'lingui/t-call-in-function': 'error',
    'lingui/no-single-variables-to-translate': 'error',
    'lingui/no-expression-in-message': 'error',
    'lingui/no-single-tag-to-translate': 'error',
    'lingui/no-trans-inside-trans': 'error',
    'lingui/text-restrictions': [
      'error',
      {
        rules: [
          {
            patterns: ["''", '`', '“'],
            message: 'Error message',
          },
        ],
      },
    ],

    '@typescript-eslint/naming-convention': [
      'error',
      {
        selector: 'variable',
        format: ['camelCase', 'PascalCase', 'UPPER_CASE'],

        // Allow const { _ } = useLingui()
        leadingUnderscore: 'allow',
      },
      {
        selector: 'function',
        format: ['camelCase', 'PascalCase'],
      },
      {
        selector: 'typeLike',
        format: ['PascalCase'],
      },
    ],
  },
});
