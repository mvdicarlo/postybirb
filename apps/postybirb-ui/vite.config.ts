import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import assets from 'vite-multiple-assets';
import { lingui } from '@lingui/vite-plugin';

export default defineConfig({
  cacheDir: '../../node_modules/.vite/postybirb-ui',
  server: {
    port: 4200,
    host: 'localhost',
  },

  build: {
    dynamicImportVarsOptions: {
      // Related to @elastic/eui/icons's dynamic import
      // https://github.com/elastic/eui/issues/5463#issuecomment-1107665339
      exclude: [],
    },
  },

  preview: {
    port: 4300,
    host: 'localhost',
  },

  plugins: [
    react({
      plugins: [['@lingui/swc-plugin', {}]],
    }),
    nxViteTsPaths(),
    lingui(),
    assets(['./lang'], {
      mimeTypes: { '.json': 'application/json' },
      ssr: false,
    }),
  ],
});
