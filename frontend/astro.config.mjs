import { defineConfig } from 'astro/config';
import { resolve } from 'node:path';

export default defineConfig({
  site: 'https://pustaka.taratsa.id',
  output: 'static',
  trailingSlash: 'never',
  build: {
    format: 'file',
  },
  vite: {
    resolve: {
      alias: {
        '~': resolve('./src'),
      },
    },
    optimizeDeps: {
      exclude: ['better-sqlite3'],
    },
    ssr: {
      external: ['better-sqlite3'],
    },
  },
});
