// @ts-check
/** @type {import('eslint').ESLint.ConfigData} */
const config = {
  root: true,
  ignorePatterns: ['**/*'],
  extends: [
    'airbnb',
    'airbnb-typescript',
    'plugin:jest/recommended',
    'plugin:@nrwl/nx/typescript',
    'eslint-config-prettier',
  ],
  plugins: ['@nrwl/nx', 'jest'],
  parserOptions: { project: './tsconfig.base.json' },
  overrides: [
    {
      files: ['*.tsx'],
      plugins: ['testing-library'],
      extends: ['plugin:testing-library/react', 'airbnb/hooks'],
    },
  ],
  rules: {
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

        depConstraints: [{ sourceTag: '*', onlyDependOnLibsWithTags: ['*'] }],
      },
    ],

    'no-plusplus': 'off',
    'no-nested-ternary': 'off',
    'no-continue': 'off',
    'no-await-in-loop': 'off',
    'no-restricted-syntax': 'off',
    'class-methods-use-this': 'off',

    'import/export': 'off',
    'import/no-cycle': 'off',
    'import/prefer-default-export': 'off',

    'react/jsx-props-no-spreading': 'off',
    'react/react-in-jsx-scope': 'off',
    'react/no-unescaped-entities': 'off',
    'react/sort-comp': 'off',
    'react/prop-types': 'off',

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

module.exports = config;
