import MiniSearch from 'minisearch';
import booksData from '~/data/books.json';
import type { BookSummary } from '~/data/types';
import { bookPath } from '~/utils/book-url';

export interface SearchableBook {
  id: number;
  title: string;
  url: string;
  cover_url: string;
  authors: Array<{ id: number; name: string }>;
  tags: string[];
  publisher: { id: number; name: string } | null;
  series: { id: number; name: string; index: number | null } | null;
}

let slimCache: SearchableBook[] | null = null;

function slimAllBooks(): SearchableBook[] {
  if (slimCache) return slimCache;
  const books = booksData as BookSummary[];
  slimCache = books.map(b => ({
    id: b.id,
    title: b.title,
    url: bookPath(b),
    cover_url: b.cover_url,
    authors: b.authors,
    tags: b.tags,
    publisher: b.publisher,
    series: b.series,
  }));
  return slimCache;
}

interface IndexedDoc extends SearchableBook {
  _authors: string;
  _tags: string;
  _series: string;
  _publisher: string;
}

let index: MiniSearch<IndexedDoc> | null = null;
let byId: Map<number, SearchableBook> | null = null;

function ensureIndex(): { ms: MiniSearch<IndexedDoc>; byId: Map<number, SearchableBook> } {
  if (!index || !byId) {
    const books = slimAllBooks();
    const ms = new MiniSearch<IndexedDoc>({
      fields: ['title', '_authors', '_tags', '_series', '_publisher'],
      storeFields: ['id'],
      searchOptions: {
        boost: { title: 4, _authors: 3, _tags: 2, _series: 2, _publisher: 1 },
        prefix: true,
        fuzzy: 0.2,
        combineWith: 'AND',
      },
    });
    ms.addAll(books.map(b => ({
      ...b,
      _authors: (b.authors || []).map(a => a.name).join(' '),
      _tags: (b.tags || []).join(' '),
      _series: b.series ? b.series.name : '',
      _publisher: b.publisher ? b.publisher.name : '',
    })));
    const map = new Map<number, SearchableBook>();
    for (const b of books) map.set(b.id, b);
    index = ms;
    byId = map;
  }
  return { ms: index, byId };
}

/**
 * Server-side catalog search over the built MiniSearch index.
 * Returns up to `limit` hits plus the untruncated match count, so callers
 * can report a truthful total when more results exist than are shown.
 */
export function searchBooks(query: string, limit = 120): { hits: SearchableBook[]; total: number } {
  const q = query.trim();
  if (!q) return { hits: [], total: 0 };
  const { ms, byId: map } = ensureIndex();
  const results = ms.search(q);
  const hits: SearchableBook[] = [];
  for (const r of results) {
    if (hits.length >= limit) break;
    const book = map.get(r.id as number);
    if (book) hits.push(book);
  }
  return { hits, total: results.length };
}
