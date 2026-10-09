// @ts-check
// @ts-expect-error No types for this import
const { transform: _, ...nxPreset } = require('@nx/jest/preset').default;
const { join } = require('path');
const basePath = __dirname.split(/(app|lib)/)[0];

/** @type {import('jest').Config} */
const config = {
  ...nxPreset,
  setupFiles: [join(basePath, 'jest.setup.ts')],
  reporters: ['summary', join(basePath, 'jest.reporter.js')],
  slowTestThreshold: 7000,
  cacheDirectory: join(process.cwd(), '.jest'),
  testEnvironment: 'node',
  transformIgnorePatterns: [
    // These packages are CJS already and give warnings about swc not being able to read source maps for them in CI
    '/diagnostic-channel/',
    '/diagnostic-channel-publishers',
    '/cron/',
  ], // There is a lot of ESM packages and swc is fast enough to transform everything
  transform: {
    '^.+\\.(ts|tsx|jsx|js|html)$': [
      '@swc/jest',
      {
        jsc: {
          // https://github.com/swc-project/swc/discussions/5151#discussioncomment-3149154
          experimental: { plugins: [['@swc-contrib/mut-cjs-exports', {}]] },
          loose: true,
          target: 'es2024', 
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
        sourceMaps: 'inline',
        inlineSourcesContent: true,
      },
    ],
  },
};

module.exports = config;
