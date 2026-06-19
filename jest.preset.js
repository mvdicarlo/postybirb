// @ts-check
// The database lib uses Node's built-in `node:sqlite`, which is gated behind
// `--experimental-sqlite` on Node < 23.4 (jest runs under the *system* Node,
// not Electron's bundled Node 24+). Set the flag on the runner process so the
// forked jest workers inherit it at startup, where the driver is loaded.
if (!process.env.NODE_OPTIONS?.includes('--experimental-sqlite')) {
  process.env.NODE_OPTIONS = [
    process.env.NODE_OPTIONS,
    '--experimental-sqlite',
    '--disable-warning=ExperimentalWarning',
  ]
    .filter(Boolean)
    .join(' ');
}

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
