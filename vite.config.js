import { fileURLToPath } from 'node:url';

import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: fileURLToPath(new URL('resources/js/index.js', import.meta.url)),
      name: 'LaravelBlocks',
      formats: ['es'],
      fileName: 'laravel-blocks',
      cssFileName: 'laravel-blocks',
    },
    outDir: 'dist',
    emptyOutDir: true,
  },
});
