#!/usr/bin/env node
/**
 * Seed Astro content snapshots from the live Calibre SQLite database.
 *
 *   node scripts/seed.mjs [CALIBRE_DB_PATH]
 *
 * Reads:
 *   metadata.db (default /srv/calibre/metadata.db or $CALIBRE_DB_PATH)
 *
 * Writes:
 *   src/content/books.json         – flat index
 *   src/content/books/<id>.json    – per-book detail with joins
 *   src/content/authors.json, authors/<id>.json
 *   src/content/series.json, series/<id>.json
 *   src/content/publishers.json, publishers/<id>.json
 *   src/content/categories.json, categories/<id>.json
 *   src/content/languages.json, languages/<code>.json
 *   src/content/formats.json
 *   src/content/ratings.json
 *   src/content/shelves.json
 *
 * Read-only — never writes to the calibre DB. PRAGMA query_only=1 enforces it.
 */

import Database from 'better-sqlite3';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT = join(ROOT, 'src', 'data');

const DB_PATH = process.argv[2]
  || process.env.CALIBRE_DB_PATH
  || '/srv/calibre/metadata.db';

const APP_DB_PATH = process.env.APP_DB_PATH
  || '/srv/calibre/app.db';

const SITE = 'https://pustaka.taratsa.id';

async function writeJson(relPath, data) {
  const full = join(OUT, relPath);
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, JSON.stringify(data, null, 2), 'utf8');
}

function cleanAuthorName(name) {
  return (name || '').replace(/\|/g, ', ').trim();
}

function openDb() {
  const db = new Database(DB_PATH, { readonly: true, fileMustExist: true });
  db.pragma('query_only = 1');
  return db;
}

async function loadBooks(db) {
  const stmt = db.prepare(`
    SELECT
      b.id            AS id,
      b.title         AS title,
      b.path          AS path,
      b.uuid          AS uuid,
      b.pubdate       AS pubdate,
      b.timestamp     AS timestamp,
      b.last_modified AS last_modified,
      b.sort          AS title_sort,
      b.author_sort   AS author_sort,
      b.series_index  AS series_index,
      b.has_cover     AS has_cover
    FROM books b
    ORDER BY b.timestamp DESC
  `);
  const books = stmt.all();

  const authorsStmt = db.prepare(`
    SELECT bal.book AS book_id, a.id AS id, a.name AS name, a.sort AS sort
    FROM books_authors_link bal
    JOIN authors a ON a.id = bal.author
    ORDER BY bal.book, a.sort
  `);
  const authorsByBook = new Map();
  for (const row of authorsStmt.all()) {
    if (!authorsByBook.has(row.book_id)) authorsByBook.set(row.book_id, []);
    authorsByBook.get(row.book_id).push({
      id: row.id,
      name: cleanAuthorName(row.name),
      sort: row.sort,
    });
  }

  const tagsStmt = db.prepare(`
    SELECT btl.book AS book_id, t.id AS id, t.name AS name
    FROM books_tags_link btl
    JOIN tags t ON t.id = btl.tag
    ORDER BY t.name
  `);
  const tagsByBook = new Map();
  for (const row of tagsStmt.all()) {
    if (!row.name || row.name === '[]') continue;
    if (!tagsByBook.has(row.book_id)) tagsByBook.set(row.book_id, []);
    tagsByBook.get(row.book_id).push({ id: row.id, name: row.name });
  }

  const seriesStmt = db.prepare(`
    SELECT bsl.book AS book_id, s.id AS id, s.name AS name
    FROM books_series_link bsl
    JOIN series s ON s.id = bsl.series
  `);
  const seriesByBook = new Map();
  for (const row of seriesStmt.all()) {
    if (!seriesByBook.has(row.book_id)) seriesByBook.set(row.book_id, []);
    seriesByBook.get(row.book_id).push({
      id: row.id,
      name: row.name,
      series_index: row.series_index,
    });
  }

  const publishersStmt = db.prepare(`
    SELECT bpl.book AS book_id, p.id AS id, p.name AS name
    FROM books_publishers_link bpl
    JOIN publishers p ON p.id = bpl.publisher
  `);
  const publishersByBook = new Map();
  for (const row of publishersStmt.all()) {
    if (!publishersByBook.has(row.book_id)) publishersByBook.set(row.book_id, []);
    publishersByBook.get(row.book_id).push({ id: row.id, name: row.name });
  }

  const languagesStmt = db.prepare(`
    SELECT bll.book AS book_id, l.id AS code, l.lang_code AS lang_code
    FROM books_languages_link bll
    JOIN languages l ON l.id = bll.lang_code
  `);
  const languagesByBook = new Map();
  for (const row of languagesStmt.all()) {
    const code = row.lang_code || row.code;
    if (!code) continue;
    if (!languagesByBook.has(row.book_id)) languagesByBook.set(row.book_id, []);
    languagesByBook.get(row.book_id).push(code);
  }

  const identifiersStmt = db.prepare(`
    SELECT id.book AS book_id, id.type AS type, id.val AS value
    FROM identifiers id
  `);
  const identifiersByBook = new Map();
  for (const row of identifiersStmt.all()) {
    if (!identifiersByBook.has(row.book_id)) identifiersByBook.set(row.book_id, []);
    identifiersByBook.get(row.book_id).push({ type: row.type, value: row.value });
  }

  const commentsStmt = db.prepare(`SELECT book, text FROM comments`);
  const commentsByBook = new Map();
  for (const row of commentsStmt.all()) {
    commentsByBook.set(row.book, row.text);
  }

  const dataStmt = db.prepare(`
    SELECT book, format, uncompressed_size, name
    FROM data
  `);
  const dataByBook = new Map();
  for (const row of dataStmt.all()) {
    if (!dataByBook.has(row.book)) dataByBook.set(row.book, []);
    dataByBook.get(row.book).push({
      format: (row.format || '').toLowerCase(),
      size: row.uncompressed_size,
      name: row.name,
    });
  }

  const ratingsStmt = db.prepare(`
    SELECT rl.book AS book_id, ROUND(AVG(r.rating), 1) AS avg_rating, COUNT(*) AS count
    FROM books_ratings_link rl
    JOIN ratings r ON r.id = rl.rating
    GROUP BY rl.book
  `);
  const ratingsByBook = new Map();
  for (const row of ratingsStmt.all()) {
    ratingsByBook.set(row.book_id, { avg: row.avg_rating, count: row.count });
  }

  const index = [];
  for (const book of books) {
    const authors = authorsByBook.get(book.id) || [];
    const tags = tagsByBook.get(book.id) || [];
    const series = seriesByBook.get(book.id) || [];
    const publishers = publishersByBook.get(book.id) || [];
    const langCodes = languagesByBook.get(book.id) || [];
    const identifiers = identifiersByBook.get(book.id) || [];
    const formats = dataByBook.get(book.id) || [];
    const rating = ratingsByBook.get(book.id) || null;
    const comment = commentsByBook.get(book.id) || null;

    const seriesIndex = book.series_index || (series[0] && series[0].series_index) || null;

    const slug = `${book.title} ${authors.map(a => a.name).join(' ')}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 120);

    const pubdateStr = book.pubdate ? String(book.pubdate).slice(0, 10) : null;
    const cleanPubdate = pubdateStr && pubdateStr !== '0101-01-01' ? pubdateStr : null;

    const summary = {
      id: book.id,
      title: book.title,
      slug,
      authors: authors.map(a => ({ id: a.id, name: a.name })),
      author_sort: book.author_sort ? cleanAuthorName(book.author_sort) : null,
      tags: tags.map(t => t.name),
      publisher: publishers[0] ? { id: publishers[0].id, name: publishers[0].name } : null,
      publishers: publishers,
      languages: langCodes,
      pubdate: cleanPubdate,
      timestamp: book.timestamp ? String(book.timestamp) : null,
      last_modified: book.last_modified ? String(book.last_modified) : null,
      series: series[0] ? { id: series[0].id, name: series[0].name, index: seriesIndex } : null,
      identifiers: identifiers,
      formats: [...new Set(formats.map(f => f.format))].filter(Boolean),
      cover_url: book.has_cover
        ? `/cover/${book.id}?c=${book.last_modified || book.timestamp || book.id}`
        : '/static/generic_cover.jpg',
      cover_og_url: book.has_cover
        ? `/cover/${book.id}/og?c=${book.last_modified || book.timestamp || book.id}`
        : '/static/images/Header_Beranda.png',
      url: `/book/${book.id}`,
      rating: rating,
    };

    const detail = {
      ...summary,
      comment,
      data: formats.map(f => ({ format: f.format, size: f.size, name: f.name })),
    };

    index.push(summary);
    await writeJson(`books/${book.id}.json`, detail);
  }

  return index;
}

function groupBy(db, tableSql, key) {
  const rows = db.prepare(tableSql).all();
  const map = new Map();
  for (const row of rows) {
    const k = row[key];
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(row);
  }
  return map;
}

async function main() {
  console.log(`[seed] reading ${DB_PATH}`);
  const db = openDb();
  try {
    const index = await loadBooks(db);
    await writeJson('books.json', index);
    console.log(`[seed] wrote ${index.length} books`);

    const authorsAll = db.prepare(`SELECT id, name, sort FROM authors ORDER BY name`).all();
    const authorsClean = authorsAll.map(a => ({
      id: a.id,
      name: cleanAuthorName(a.name),
      sort: a.sort,
    }));
    await writeJson('authors.json', authorsClean);
    console.log(`[seed] wrote ${authorsClean.length} authors`);

    const seriesAll = db.prepare(`SELECT id, name, sort FROM series ORDER BY name`).all();
    await writeJson('series.json', seriesAll);
    console.log(`[seed] wrote ${seriesAll.length} series`);

    const publishersAll = db.prepare(`SELECT id, name, sort FROM publishers ORDER BY name`).all();
    await writeJson('publishers.json', publishersAll);
    console.log(`[seed] wrote ${publishersAll.length} publishers`);

    const categoriesAll = db.prepare(`SELECT id, name FROM tags WHERE name != '' AND name != '[]' ORDER BY name`).all();
    await writeJson('categories.json', categoriesAll);
    console.log(`[seed] wrote ${categoriesAll.length} categories (tags)`);

    const languagesAll = db.prepare(`SELECT id, lang_code FROM languages ORDER BY lang_code`).all();
    await writeJson('languages.json', languagesAll);
    console.log(`[seed] wrote ${languagesAll.length} languages`);

    await writeJson('formats.json', [
      { key: 'pdf', label: 'PDF' },
      { key: 'epub', label: 'EPUB' },
      { key: 'mobi', label: 'MOBI' },
      { key: 'azw3', label: 'AZW3' },
      { key: 'cbr', label: 'CBR' },
      { key: 'cbz', label: 'CBZ' },
      { key: 'djvu', label: 'DJVU' },
      { key: 'txt', label: 'TXT' },
      { key: 'mp3', label: 'MP3' },
    ]);

    const ratingsStmt = db.prepare(`
      SELECT r.id AS id, r.rating AS rating, COUNT(rl.book) AS count
      FROM ratings r
      LEFT JOIN books_ratings_link rl ON rl.rating = r.id
      GROUP BY r.id
      ORDER BY r.rating DESC
    `);
    await writeJson('ratings.json', ratingsStmt.all());
    console.log('[seed] wrote ratings');

    // Public shelves live in app.db (SQLAlchemy), not metadata.db.
    const exists = await import('node:fs').then(m => m.existsSync(APP_DB_PATH));
    if (exists) {
      const appDb = new Database(APP_DB_PATH, { readonly: true, fileMustExist: true });
      appDb.pragma('query_only = 1');
      try {
        const shelfRows = appDb.prepare(`SELECT id, name FROM shelf WHERE is_public = 1 ORDER BY name`).all();
        const shelfBooks = appDb.prepare(`
          SELECT bsl.shelf AS shelf_id, bsl.book_id AS book_id, bsl."order" AS ord
          FROM book_shelf_link bsl
          JOIN shelf s ON s.id = bsl.shelf
          WHERE s.is_public = 1
          ORDER BY bsl.shelf, bsl."order"
        `).all();

        const shelfMap = new Map();
        for (const s of shelfRows) shelfMap.set(s.id, { ...s, book_ids: [] });
        for (const row of shelfBooks) {
          if (shelfMap.has(row.shelf_id)) shelfMap.get(row.shelf_id).book_ids.push(row.book_id);
        }

        const shelves = [...shelfMap.values()];
        await writeJson('shelves.json', shelves);
        console.log(`[seed] wrote ${shelves.length} public shelves`);
      } finally {
        appDb.close();
      }
    } else {
      await writeJson('shelves.json', []);
      console.log('[seed] no app.db — wrote empty shelves.json');
    }
  } finally {
    db.close();
  }
}

main().catch(err => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
