// vite.config.ts
import { resolve } from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import solid from 'vite-plugin-solid';

// https://vitejs.dev/guide/build.html#library-mode

const entryRoot = resolve(__dirname, 'src/index.ts');

export default defineConfig({
  build: {
    sourcemap: true,
    lib: {
      entry: entryRoot,
      name: 'index',
      formats: ['es'],
      fileName: 'index',
    },
    rolldownOptions: {
      external: ['solid-js', 'solid-js/web', 'roughjs', '@micurs/ts-geopro'],
    },
  },
  plugins: [solid(), dts({ bundleTypes: true })],
});
