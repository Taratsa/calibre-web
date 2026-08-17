import { defineConfig } from 'astro/config';
import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import node from '@astrojs/node';

export default defineConfig({
  site: 'https://pustaka.taratsa.id',
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
  integrations: [sitemap({
    filter: (page) => {
      const path = new URL(page).pathname;
      const isAuthorAlias = /^\/author\/[^/]+\/\d+\/?$/.test(path);
      const isLegacyAuthorPath = /^\/author\/\d+(?:\/page\/\d+)?\/?$/.test(path);
      const isLegacyBookPath = /^\/book\/\d+\/?$/.test(path);
      return path !== '/search'
        && !(path === '/page' || /\/page\/\d+$/.test(path))
        && !isAuthorAlias
        && !isLegacyAuthorPath
        && !isLegacyBookPath;
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
