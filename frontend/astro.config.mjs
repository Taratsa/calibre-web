import { defineConfig } from 'astro/config';
import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://pustaka.taratsa.id',
  output: 'static',
  trailingSlash: 'never',
  build: {
    format: 'file',
  },
  integrations: [sitemap({
    filter: (page) => {
      const path = new URL(page).pathname;
      return path !== '/search' && !(path === '/page' || /\/page\/\d+$/.test(path));
    },
  })],
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
