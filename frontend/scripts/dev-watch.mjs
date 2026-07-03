#!/usr/bin/env node
/**
 * Dev-time watcher. Re-runs seed.mjs when metadata.db changes, then signals
 * Astro dev server via a TCP poke to trigger HMR (Astro watches source files).
 */

import { watch } from 'node:fs';
import { spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DB_PATH = process.env.CALIBRE_DB_PATH || '/srv/calibre/metadata.db';

let pending = null;
function rerun() {
  if (pending) return;
  pending = setTimeout(() => {
    pending = null;
    console.log('[watch] re-seeding');
    const child = spawn('node', ['scripts/seed.mjs'], { cwd: ROOT, stdio: 'inherit' });
    child.on('exit', code => {
      if (code !== 0) console.error('[watch] seed exited', code);
    });
  }, 200);
}

console.log(`[watch] watching ${DB_PATH}`);
try {
  watch(DB_PATH, { persistent: true }, () => rerun());
} catch (err) {
  console.error('[watch] cannot watch DB directly:', err.message);
  const { watch } = await import('node:fs');
  watch(dirname(DB_PATH), { recursive: false }, (_, filename) => {
    if (filename === DB_PATH.split('/').pop()) rerun();
  });
}
