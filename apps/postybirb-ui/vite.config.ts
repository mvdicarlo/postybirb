import { lingui } from '@lingui/vite-plugin';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';

export default defineConfig({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/postybirb-ui',
  server: {
    port: 4200,
    host: 'localhost',
  },

  build: {
    outDir: '../../dist/apps/postybirb-ui',
    reportCompressedSize: true,
    commonjsOptions: { transformMixedEsModules: true },

    // Because we are loading files from file:// protocol
    // in production we dont really need to care about this
    chunkSizeWarningLimit: 10000,

    minify: false,
  },

  preview: {
    port: 4300,
    host: 'localhost',
  },

  plugins: [
    // replaceFiles([
    //   {
    //     replace: 'apps/postybirb-ui/src/environments/environment.ts',
    //     with: 'apps/postybirb-ui/src/environments/environment.prod.ts',
    //   },
    // ]),
    react({
      plugins: [['@lingui/swc-plugin', {}]],
    }),
    nxViteTsPaths(),
    lingui(),
  ],
});
