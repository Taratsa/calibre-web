import { defineConfig } from 'astro/config';
import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';

export default defineConfig({
  site: 'https://pustaka.taratsa.id',
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
  vite: {
    plugins: [tailwindcss()],
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
