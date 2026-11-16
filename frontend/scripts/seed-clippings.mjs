#!/usr/bin/env node
/**
 * Snapshot the published newsletter clippings ("kliping") into src/data.
 *
 * Source of truth: Markdown files with YAML frontmatter written by the Flask admin (/admin/clippings, see
 * cps/clippings_store.py). Only `status: published` files are exported; drafts never leave the backend.
 *
 *   src/data/clippings.json        – index (metadata + excerpt), newest first
 *   src/data/clippings/<id>.json   – metadata + Markdown body
 *
 * Usage: node scripts/seed-clippings.mjs [clippings-dir]   (also called by seed.mjs)
 * Keeps the previous snapshot when the source directory does not exist.
 */

import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'src', 'data');

// Mirrors cps/clippings_store.py (ID_RE, DATE_RE, KNOWN_KEYS); keep the two in sync.
const ID_RE = /^[a-z0-9][a-z0-9-]{0,119}$/;
const DATE_RE = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/;
const CLOSING_FENCE_RE = /^(?:---|\.\.\.)[ \t]*$/m;

function text(value) {
  if (value === null || value === undefined || typeof value === 'object') return '';
  return String(value).trim();
}

function list(value) {
  const items = typeof value === 'string' ? value.split(/[,\n]/) : Array.isArray(value) ? value : [];
  return [...new Set(items.map(text).filter(Boolean))];
}

/** Returns `{ meta, body }`, or throws with the reason the file is skipped. */
export function parseClipping(id, source) {
  const doc = source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  if (!doc.startsWith('---\n')) throw new Error('no frontmatter');
  const rest = doc.slice(4);
  const closing = CLOSING_FENCE_RE.exec(rest);
  if (!closing) throw new Error('frontmatter is not closed');
  const raw = parse(rest.slice(0, closing.index)) ?? {};
  if (typeof raw !== 'object' || Array.isArray(raw)) throw new Error('frontmatter is not a mapping');

  const title = text(raw.title);
  if (!title) throw new Error('title is required');
  const date = text(raw.date);
  if (date) {
    const m = DATE_RE.exec(date);
    const valid = m && !Number.isNaN(Date.parse(`${m[1]}-${m[2] ?? '01'}-${m[3] ?? '01'}T00:00:00Z`));
    if (!valid) throw new Error(`invalid date ${date}`);
  }
  const sourceUrl = text(raw.source_url);
  const number = /^[1-9]\d*$/.test(text(raw.number)) ? Number(text(raw.number)) : 0;
  const meta = {
    id,
    number,
    title,
    publication: text(raw.publication),
    date,
    issue: text(raw.issue),
    page: text(raw.page),
    authors: list(raw.authors),
    tags: list(raw.tags),
    language: text(raw.language),
    source_url: /^https?:\/\/\S+$/.test(sourceUrl) ? sourceUrl : '',
    status: text(raw.status).toLowerCase() || 'draft',
  };
  return { meta, body: rest.slice(closing.index + closing[0].length).replace(/^\n/, '').trim() };
}

function excerpt(body) {
  return body
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
}

export async function seedClippings(dir) {
  let files;
  try {
    files = await readdir(dir);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.warn(`[seed] clippings dir ${dir} not found; kept existing clippings snapshot`);
      return null;
    }
    throw error;
  }

  const published = [];
  const numbers = new Map();
  for (const file of files.filter((name) => name.endsWith('.md')).sort()) {
    const id = file.slice(0, -3);
    if (!ID_RE.test(id)) continue;
    try {
      const clipping = parseClipping(id, await readFile(join(dir, file), 'utf8'));
      if (clipping.meta.status !== 'published') continue;
      const { number } = clipping.meta;
      if (number && numbers.has(number)) {
        console.warn(`[seed] clipping ${file}: number ${number} already used by ${numbers.get(number)}; alias dropped`);
        clipping.meta.number = 0;
      } else if (number) {
        numbers.set(number, id);
      }
      published.push(clipping);
    } catch (error) {
      console.warn(`[seed] skipped clipping ${file}: ${error.message}`);
    }
  }
  published.sort((a, b) => b.meta.date.localeCompare(a.meta.date) || a.meta.title.localeCompare(b.meta.title, 'id'));

  // The directory is rebuilt as a whole so unpublished or deleted clippings disappear from the snapshot.
  const detailDir = join(OUT, 'clippings');
  await rm(detailDir, { recursive: true, force: true });
  await mkdir(detailDir, { recursive: true });
  for (const { meta, body } of published) {
    await writeFile(join(detailDir, `${meta.id}.json`), JSON.stringify({ ...meta, body }, null, 2), 'utf8');
  }
  const index = published.map(({ meta, body }) => ({ ...meta, excerpt: excerpt(body) }));
  await writeFile(join(OUT, 'clippings.json'), JSON.stringify(index, null, 2), 'utf8');
  console.log(`[seed] wrote ${index.length} published clippings`);
  return index;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await seedClippings(process.argv[2] || process.env.CLIPPINGS_DIR || join(ROOT, '..', 'data', 'clippings'));
}
