import { lingui } from '@lingui/vite-plugin';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/postybirb-ui',

  resolve: {
    alias: {
      // The @tiptap/react/menus subpath export causes a circular import
      // that Vite's dev server can't resolve. Point directly at the file.
      '@tiptap/react/menus': path.resolve(
        __dirname,
        '../../node_modules/@tiptap/react/dist/menus/index.js',
      ),
    },
  },
  server: {
    port: 4200,
    host: '127.0.0.1',
    fs: {
      // blocknote loads fonts from node_modules folder which
      // is at the ../../ because for vite cwd is postybitb-ui workspace
      allow: ['../../node_modules/'],
    },
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
