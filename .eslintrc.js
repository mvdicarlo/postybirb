// @ts-check

// Disable this annoying red lines under unformatted code
// if there is prettier extensions installed
let prettierExtension = process.env.VSCODE_CWD;

module.exports = {
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

            // We allow it because we need to use import from
            // postybirb-ui to make jump-to definition in the
            // FieldType.label
            allow: ['@postybirb/form-builder'],

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
    'class-methods-use-this': 'off',
    'no-await-in-loop': 'off',
    'import/no-cycle': 'off',
    'import/prefer-default-export': 'off',
    'react/jsx-props-no-spreading': 'off',
    'react/react-in-jsx-scope': 'off',
    'no-restricted-syntax': 'off',

    '@typescript-eslint/ban-types': 'warn',
    'import/no-extraneous-dependencies': [
      'warn',
      {
        // These dependencies will be considered
        // as bundled and no warning will be shown
        bundledDependencies: ['electron'],
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
};
