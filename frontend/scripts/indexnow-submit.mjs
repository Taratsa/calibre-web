#!/usr/bin/env node
/**
 * IndexNow URL submission.
 *
 *   node scripts/indexnow-submit.mjs [--sitemap PATH] [--host HOST] [--key KEY]
 *
 * Reads URLs from a local sitemap XML file. The default path is retained
 * for local compatibility; download the live /sitemap.xml first when the
 * runtime sitemap is the source of truth.
 * Groups URLs into batches of up to 10,000 and POSTs them to
 * https://api.indexnow.org/indexnow. Bing, Yandex, Seznam, Naver all
 * participate in the IndexNow network so one submission is enough.
 *
 * Required env:
 *   INDEXNOW_KEY   8-128 hex chars. Must match the file at
 *                  https://<host>/<INDEXNOW_KEY>.txt on the live site.
 *
 * Optional env:
 *   INDEXNOW_HOST  Override the host (default: pustaka.taratsa.id).
 *   INDEXNOW_DRY_RUN  If set, print the request body and skip the API call.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DIST = join(ROOT, 'dist');

const KEY = process.env.INDEXNOW_KEY;
if (!KEY) {
  console.error('[indexnow] INDEXNOW_KEY not set; skipping submission.');
  process.exit(0);
}
if (!/^[a-zA-Z0-9-]{8,128}$/.test(KEY)) {
  console.error(`[indexnow] INDEXNOW_KEY must be 8-128 alphanumeric chars; got ${KEY.length}`);
  process.exit(1);
}

const HOST = process.env.INDEXNOW_HOST || 'pustaka.taratsa.id';
const ENDPOINT = process.env.INDEXNOW_ENDPOINT || 'https://api.indexnow.org/indexnow';
const DRY_RUN = process.env.INDEXNOW_DRY_RUN === '1' || process.argv.includes('--dry-run');
const BATCH = 10000;

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--sitemap') opts.sitemap = args[++i];
    else if (args[i] === '--host') opts.host = args[++i];
    else if (args[i] === '--key') opts.key = args[++i];
  }
  return opts;
}

const cliOpts = parseArgs();
const sitemapPath = cliOpts.sitemap
  ? resolve(cliOpts.sitemap)
  : join(DIST, 'sitemap.xml');

if (!existsSync(sitemapPath)) {
  console.error(`[indexnow] sitemap not found: ${sitemapPath}`);
  process.exit(1);
}

const xml = readFileSync(sitemapPath, 'utf8');
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].trim()).filter(Boolean);
console.log(`[indexnow] parsed ${urls.length} URLs from ${sitemapPath}`);

if (urls.length === 0) {
  console.log('[indexnow] sitemap is empty; skipping.');
  process.exit(0);
}

const host = cliOpts.host || HOST;
const key = cliOpts.key || KEY;

async function submitBatch(batch) {
  const body = {
    host,
    key,
    keyLocation: `https://${host}/${key}.txt`,
    urlList: batch,
  };
  if (DRY_RUN) {
    console.log('[indexnow] (dry-run) would POST to', ENDPOINT);
    console.log(JSON.stringify({ ...body, urlList: `<${batch.length} urls>` }, null, 2));
    return { ok: true, status: 0, dryRun: true };
  }
  const resp = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });
  const text = await resp.text();
  // 200 = submitted, 202 = accepted (key still being verified, retryable).
  const ok = resp.ok || resp.status === 202;
  return { ok, status: resp.status, text };
}

(async () => {
  let totalSubmitted = 0;
  for (let i = 0; i < urls.length; i += BATCH) {
    const slice = urls.slice(i, i + BATCH);
    const result = await submitBatch(slice);
    const tag = result.ok ? 'OK' : 'ERR';
    console.log(
      `[indexnow] ${tag} batch ${Math.floor(i / BATCH) + 1}: ` +
      `${slice.length} urls, HTTP ${result.status}` +
      (result.text ? `, body: ${result.text.slice(0, 200)}` : '')
    );
    if (!result.ok) {
      console.error(`[indexnow] submission failed at offset ${i}; aborting.`);
      process.exit(2);
    }
    totalSubmitted += slice.length;
  }
  console.log(`[indexnow] submitted ${totalSubmitted} URLs to IndexNow`);
})().catch(err => {
  console.error('[indexnow] failed:', err);
  process.exit(1);
});