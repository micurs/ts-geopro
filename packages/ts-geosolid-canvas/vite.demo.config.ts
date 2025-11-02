import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solid()],
  root: 'demo',
  server: {
    port: 3001,
  },
  resolve: {
    dedupe: ['solid-js'],
  },
});
