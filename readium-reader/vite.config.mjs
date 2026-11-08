import { defineConfig } from 'vite';

// One self-contained IIFE exposing `window.Readium`; Readium CSS and the in-frame scripts are inlined (?raw imports).
export default defineConfig({
  build: {
    outDir: '../cps/static/js/libs',
    emptyOutDir: false,
    target: 'es2020',
    minify: true,
    lib: {
      entry: 'src/entry.ts',
      name: 'Readium',
      formats: ['iife'],
      fileName: () => 'readium.js',
    },
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
