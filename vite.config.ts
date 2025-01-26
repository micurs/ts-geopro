// vite.config.ts
import { resolve } from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
// import checker from 'vite-plugin-checker';

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
  },
  plugins: [dts({ rollupTypes: true })],
    // plugins: [checker({ typescript: true }), dts({ rollupTypes: true })],
});
