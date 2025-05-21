// @ts-check
// @ts-expect-error No types for this import
const { transform: _, ...nxPreset } = require('@nx/jest/preset').default;
const { join } = require('path');
const fsExtra = require('fs-extra');
const basePath = __dirname.split(/(app|lib)/)[0];

/** @type {import('jest').Config} */
const config = {
  ...nxPreset,
  setupFiles: [join(basePath, 'jest.setup.ts')],
  silent: true,
  prettierPath: require.resolve('prettier-2'),
  cacheDirectory: join(process.cwd(), '.jest'),

  // Jest does not fully support esm, so the only way is to convert those esm packages to cjs using transformer
  transformIgnorePatterns: [
    `/node_modules/(?!(${getESMDependenciesFrom('node_modules').join('|')})/)`,
  ],

  transform: {
    '^.+\\.(ts|tsx|jsx|js|html)$': [
      '@swc/jest',
      {
        jsc: {
          // https://github.com/swc-project/swc/discussions/5151#discussioncomment-3149154
          experimental: { plugins: [['swc_mut_cjs_exports', {}]] },
          loose: true,
          target: 'es2020',
          parser: {
            syntax: 'typescript',
            tsx: true,
            decorators: true,
            decoratorsBeforeExport: true,
          },
          transform: {
            legacyDecorator: true,
            decoratorMetadata: true,
          },
        },
        sourceMaps: true,
      },
    ],
  },
};

module.exports = config;

function addESMDependencyToResult(
  folder = 'node_modules/@atproto/api',
  result = [],
) {
  try {
    const packageJson = fsExtra.readJsonSync(
      join(folder, 'package.json'),
      'utf-8',
    );
    if (packageJson.type === 'module') result.push(packageJson.name);
  } catch (e) {}
}

function getESMDependenciesFrom(folderToRead = 'node_modules', result = []) {
  for (const folder of fsExtra.readdirSync(folderToRead, {
    withFileTypes: true,
  })) {
    if (folder.isDirectory()) {
      const fullPath = join(folderToRead, folder.name);
      if (folder.name.startsWith('@')) {
        getESMDependenciesFrom(fullPath, result);
      } else addESMDependencyToResult(fullPath, result);
    }
  }

  return result;
}
