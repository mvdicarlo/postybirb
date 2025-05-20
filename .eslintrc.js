// @ts-check

// It takes a lot of i time and reports errors like insert <newline> which are useless
let usePrettierPlugin = false;

module.exports = {
  root: true,
  ignorePatterns: ['**/*'],
  extends: [
    usePrettierPlugin
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
    usePrettierPlugin ? '' : 'prettier',
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
        ...(usePrettierPlugin
          ? { 'prettier/prettier': ['error', { endOfLine: 'crlf' }] }
          : {}),

        '@nrwl/nx/enforce-module-boundaries': [
          'error',
          {
            enforceBuildableLibDependency: true,

            // We allow it because we need to use import from
            // postybirb-ui to make jump-to definition in the
            // FieldType.label
            allow: [
              '@postybirb/form-builder',
              '@postybirb/translations',
              '@postybirb/types',
            ],

            depConstraints: [
              { sourceTag: '*', onlyDependOnLibsWithTags: ['*'] },
            ],
          },
        ],
      },
    },
    {
      files: ['*.ts', '*.tsx'],
      extends: ['plugin:@nrwl/nx/typescript'],
      rules: {
        // some nx rules for specific files override globally disabled rules
        '@typescript-eslint/no-unused-vars': 'off',
        'no-continue': 'off',
      },
    },
    {
      files: ['*.js', '*.jsx'],
      extends: ['plugin:@nrwl/nx/javascript'],
      rules: {
        '@typescript-eslint/no-unused-vars': 'off',
      },
    },
  ],
  rules: {
    'no-plusplus': 'off',
    'no-nested-ternary': 'off',
    'no-continue': 'off',
    'no-await-in-loop': 'off',
    'no-restricted-syntax': 'off',
    'class-methods-use-this': 'off',

    'import/no-cycle': 'off',
    'import/prefer-default-export': 'off',

    'react/jsx-props-no-spreading': 'off',
    'react/react-in-jsx-scope': 'off',
    'react/no-unescaped-entities': 'off',

    '@typescript-eslint/ban-types': 'warn',
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/no-use-before-define': 'off',

    'import/extension': 'off',
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
