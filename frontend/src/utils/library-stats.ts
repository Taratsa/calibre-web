import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getAllAuthors, getAllBooks, getAllCategories, getAllPublishers, getAllSeries } from '~/data';
import { authorPath } from '~/utils/author-url';
import type { BookDataEntry } from '~/data/types';

export interface CountRow {
  key: string;
  label: string;
  count: number;
  href?: string;
}

export interface LibraryStats {
  books: number;
  authors: number;
  publishers: number;
  series: number;
  categories: number;
  totalBytes: number;
  filesCounted: number;
  formats: CountRow[];
  languages: CountRow[];
  languageUnset: number;
  addedByYear: CountRow[];
  topAuthors: CountRow[];
  topPublishers: CountRow[];
  withoutPublisher: number;
  newest: string | null;
}

// Catalog placeholders that would otherwise dominate the author ranking.
const PLACEHOLDER_AUTHORS: Record<string, true> = {
  'tidak diketahui': true,
  unknown: true,
  anonim: true,
  anonymous: true,
  'external links': true,
};

const LANGUAGE_NAMES: Record<string, string> = { ind: 'Indonesia', eng: 'Inggris', msa: 'Melayu' };

function top(counts: Map<string, CountRow>, limit: number): CountRow[] {
  return [...counts.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)).slice(0, limit);
}

function bump(map: Map<string, CountRow>, key: string, label: string, href?: string): void {
  const row = map.get(key);
  if (row) row.count++;
  else map.set(key, { key, label, count: 1, href });
}

// Per-book detail files hold the only file sizes; read them once per SSR process.
let sizeCache: { bytes: number; files: number } | null = null;
function totalFileSize(bookIds: number[]): { bytes: number; files: number } {
  if (sizeCache) return sizeCache;
  const dir = join(process.cwd(), 'src', 'data', 'books');
  let bytes = 0;
  let files = 0;
  for (const id of bookIds) {
    try {
      const detail = JSON.parse(readFileSync(join(dir, `${id}.json`), 'utf8')) as { data?: BookDataEntry[] };
      for (const entry of detail.data ?? []) {
        if (entry.size) {
          bytes += entry.size;
          files++;
        }
      }
    } catch {
      // Missing detail file: size unknown for that book.
    }
  }
  sizeCache = { bytes, files };
  return sizeCache;
}

let statsCache: LibraryStats | null = null;

export function getLibraryStats(): LibraryStats {
  if (statsCache) return statsCache;
  const books = getAllBooks();

  const formats = new Map<string, CountRow>();
  const languages = new Map<string, CountRow>();
  const years = new Map<string, CountRow>();
  const authors = new Map<string, CountRow>();
  const publishers = new Map<string, CountRow>();
  let languageUnset = 0;
  let withoutPublisher = 0;
  let newest: string | null = null;

  for (const book of books) {
    for (const f of new Set(book.formats.map(x => x.toLowerCase()))) {
      bump(formats, f, f.toUpperCase(), `/formats/#${f}`);
    }
    if (book.languages.length === 0) languageUnset++;
    for (const code of book.languages) {
      bump(languages, code, LANGUAGE_NAMES[code] ?? code, `/language/${code}`);
    }
    const year = book.timestamp?.slice(0, 4);
    if (year) bump(years, year, year);
    if (book.timestamp && (!newest || book.timestamp > newest)) newest = book.timestamp;
    for (const a of book.authors) {
      if (!Object.hasOwn(PLACEHOLDER_AUTHORS, a.name.trim().toLowerCase())) bump(authors, String(a.id), a.name, authorPath(a));
    }
    if (book.publisher) bump(publishers, String(book.publisher.id), book.publisher.name, `/publisher/${book.publisher.id}`);
    else withoutPublisher++;
  }

  const size = totalFileSize(books.map(b => b.id));

  statsCache = {
    books: books.length,
    authors: getAllAuthors().length,
    publishers: getAllPublishers().length,
    series: getAllSeries().length,
    categories: getAllCategories().length,
    totalBytes: size.bytes,
    filesCounted: size.files,
    formats: top(formats, 10),
    languages: top(languages, 10),
    languageUnset,
    addedByYear: [...years.values()].sort((a, b) => a.key.localeCompare(b.key)),
    topAuthors: top(authors, 10),
    topPublishers: top(publishers, 10),
    withoutPublisher,
    newest,
  };
  return statsCache;
}
