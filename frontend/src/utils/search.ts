import MiniSearch from 'minisearch';
import booksData from '~/data/books.json';
import type { BookSummary } from '~/data/types';
import { reliablePubdate } from '~/utils/pubdate';

export interface SearchableBook extends BookSummary {
  /** Publication year, or null when the catalog only has Calibre's import-date placeholder. */
  year: number | null;
  /** Import time in ms, for "newest first". */
  added: number;
}

let slimCache: SearchableBook[] | null = null;

function slimAllBooks(): SearchableBook[] {
  if (slimCache) return slimCache;
  const books = booksData as BookSummary[];
  slimCache = books.map(b => {
    const published = reliablePubdate(b);
    const year = published ? Number.parseInt(published.slice(0, 4), 10) : Number.NaN;
    const added = b.timestamp ? Date.parse(b.timestamp.slice(0, 10)) : Number.NaN;
    return {
      ...b,
      languages: b.languages ?? [],
      formats: (b.formats ?? []).map(f => f.toLowerCase()),
      year: Number.isNaN(year) ? null : year,
      added: Number.isNaN(added) ? 0 : added,
    };
  });
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

// ── Query syntax ──────────────────────────────────────────────────────────

export interface ParsedQuery {
  /** Plain words, matched like the simple search (all must match, prefix and typo tolerant). */
  words: string[];
  /** "exact phrase": whole words in order, inside one field. */
  phrases: string[];
  /** -word: books matching it (prefix match) are removed. */
  notWords: string[];
  /** -"exact phrase": books containing it are removed. */
  notPhrases: string[];
}

/** Lower-case, accent-free, punctuation collapsed to single spaces, so "Soekarno," equals "soekarno". */
export function normalizeText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/**
 * Split a search box into words, "phrases" and -exclusions. An unclosed quote is read as plain words, and a lone "-"
 * is ignored, so a half-typed query never throws or silently empties the results.
 */
export function parseQuery(raw: string): ParsedQuery {
  const parsed: ParsedQuery = { words: [], phrases: [], notWords: [], notPhrases: [] };
  const pattern = /(-?)"([^"]*)"|(-?)(\S+)/g;
  for (const match of raw.matchAll(pattern)) {
    const negative = (match[1] ?? match[3]) === '-';
    if (match[2] !== undefined) {
      const phrase = normalizeText(match[2]);
      if (!phrase) continue;
      (negative ? parsed.notPhrases : parsed.phrases).push(phrase);
      continue;
    }
    const word = (match[4] ?? '').replace(/"/g, '');
    if (!normalizeText(word)) continue;
    (negative ? parsed.notWords : parsed.words).push(word);
  }
  return parsed;
}

// ── Search ────────────────────────────────────────────────────────────────

export type SortKey = 'relevance' | 'newest' | 'title' | 'year';
export const SORT_KEYS: readonly SortKey[] = ['relevance', 'newest', 'title', 'year'];

export interface SearchRequest {
  /** Main box: words, "phrases" and -exclusions. */
  q?: string;
  title?: string;
  author?: string;
  publisher?: string;
  series?: string;
  tag?: string;
  lang?: string;
  format?: string;
  yearFrom?: number | null;
  yearTo?: number | null;
  sort?: SortKey;
}

export interface SearchOutcome {
  /** Every match, already sorted. */
  matches: SearchableBook[];
  parsed: ParsedQuery;
  /** Words to highlight in titles. */
  highlight: string[];
  /** True when a year filter was applied, which drops every book without a reliable publication year. */
  yearFilterApplied: boolean;
}

const FIELD_KEYS = {
  title: 'title',
  author: '_authors',
  publisher: '_publisher',
  series: '_series',
  tag: '_tags',
} as const;

type FieldRequestKey = keyof typeof FIELD_KEYS;

export function hasAdvancedCriteria(request: SearchRequest): boolean {
  return Boolean(
    (Object.keys(FIELD_KEYS) as FieldRequestKey[]).some(key => (request[key] ?? '').trim()) ||
    request.lang ||
    request.format ||
    request.yearFrom != null ||
    request.yearTo != null ||
    (request.sort && request.sort !== 'relevance') ||
    /(^|\s)-?"/.test(request.q ?? '') ||
    /(^|\s)-\S/.test(request.q ?? ''),
  );
}

function containsPhrase(book: SearchableBook, phrase: string): boolean {
  const needle = ` ${phrase} `;
  const fields = [
    normalizeText(book.title),
    normalizeText((book.authors || []).map(a => a.name).join(' ')),
    ...(book.tags || []).map(normalizeText),
    normalizeText(book.series ? book.series.name : ''),
    normalizeText(book.publisher ? book.publisher.name : ''),
  ];
  return fields.some(text => ` ${text} `.includes(needle));
}

/**
 * Catalog search over the built MiniSearch index: free text with "phrases" and -exclusions, per-field boxes,
 * language/format/year filters and sorting. A request with only `q` behaves exactly like the old simple search.
 */
export function searchCatalog(request: SearchRequest): SearchOutcome {
  const { ms, byId: map } = ensureIndex();
  const parsed = parseQuery(request.q ?? '');
  const highlight = new Set<string>();

  let scores: Map<number, number> | null = null;
  const intersect = (hits: Array<{ id: number; score: number }>): void => {
    const next = new Map<number, number>();
    for (const hit of hits) {
      if (scores === null) next.set(hit.id, hit.score);
      else if (scores.has(hit.id)) next.set(hit.id, (scores.get(hit.id) ?? 0) + hit.score);
    }
    scores = next;
  };

  if (parsed.words.length > 0) {
    intersect(ms.search(parsed.words.join(' ')));
    for (const word of parsed.words) highlight.add(word.toLowerCase());
  }
  for (const key of Object.keys(FIELD_KEYS) as FieldRequestKey[]) {
    const value = (request[key] ?? '').trim();
    if (!value) continue;
    // Field boxes filter precisely (prefix only): typo tolerance belongs to the main box, and here "aidit" must not
    // return "Audit" in a title or "Adit" as an author.
    intersect(ms.search(value, { fields: [FIELD_KEYS[key]], fuzzy: 0 }));
    if (key === 'title') for (const word of value.toLowerCase().split(/\s+/)) if (word) highlight.add(word);
  }
  for (const phrase of parsed.phrases) for (const word of phrase.split(' ')) highlight.add(word);

  // No text criteria at all: every book is a candidate and the filters below do the work.
  if (scores === null) {
    const all = new Map<number, number>();
    for (const book of map.values()) all.set(book.id, 0);
    scores = all;
  }
  const candidates: Map<number, number> = scores;

  for (const word of parsed.notWords) {
    for (const hit of ms.search(word, { fuzzy: 0, combineWith: 'OR' })) candidates.delete(hit.id);
  }

  const wantedLang = (request.lang ?? '').trim();
  const wantedFormat = (request.format ?? '').trim().toLowerCase();
  const yearFilterApplied = request.yearFrom != null || request.yearTo != null;

  let matches: SearchableBook[] = [];
  for (const [id, score] of candidates) {
    const book = map.get(id);
    if (!book) continue;
    if (wantedLang && !book.languages.includes(wantedLang)) continue;
    if (wantedFormat && !book.formats.includes(wantedFormat)) continue;
    if (yearFilterApplied) {
      if (book.year === null) continue;
      if (request.yearFrom != null && book.year < request.yearFrom) continue;
      if (request.yearTo != null && book.year > request.yearTo) continue;
    }
    if (parsed.phrases.some(phrase => !containsPhrase(book, phrase))) continue;
    if (parsed.notPhrases.some(phrase => containsPhrase(book, phrase))) continue;
    matches.push(book);
    candidates.set(id, score);
  }

  const hasText = parsed.words.length > 0 || Object.keys(FIELD_KEYS).some(k => (request[k as FieldRequestKey] ?? '').trim());
  const sort: SortKey = request.sort && SORT_KEYS.includes(request.sort) ? request.sort : 'relevance';
  const byNewest = (a: SearchableBook, b: SearchableBook) => b.added - a.added || b.id - a.id;
  if (sort === 'title') {
    matches = matches.sort((a, b) => a.title.localeCompare(b.title, 'id', { sensitivity: 'base' }) || a.id - b.id);
  } else if (sort === 'year') {
    // Books without a reliable year go last, whichever direction.
    matches = matches.sort((a, b) => (b.year ?? -1) - (a.year ?? -1) || byNewest(a, b));
  } else if (sort === 'newest' || !hasText) {
    matches = matches.sort(byNewest);
  } else {
    matches = matches.sort((a, b) => (candidates.get(b.id) ?? 0) - (candidates.get(a.id) ?? 0) || byNewest(a, b));
  }

  return { matches, parsed, highlight: [...highlight], yearFilterApplied };
}

export interface BookPathSuggestions {
  /** The book the slug's trailing "-<id>" points at, when it exists and its title shares a word with the slug. */
  exact: SearchableBook | null;
  /** Words read from the slug, as searched. */
  query: string;
  /** Best title/author/tag matches for those words (any of them, best first), without `exact`. */
  books: SearchableBook[];
}

/**
 * For a 404 on `/book/<slug>/`: what the visitor probably meant. A mistyped slug keeps most of its words and often the
 * trailing id, so the id finds the book itself and the words (OR, so one garbled word does not empty the result) find
 * its neighbours. Returns null for other paths. A trailing number is only trusted as an id when the book's title shares
 * a word with the slug, because "...-1998" is far more likely a year than book 1998.
 */
export function suggestForBookPath(pathname: string, limit = 12): BookPathSuggestions | null {
  const match = /^\/book\/([^/]+)\/?$/.exec(pathname);
  if (!match) return null;
  let slug: string;
  try {
    slug = decodeURIComponent(match[1]);
  } catch {
    return null;
  }
  if (/^\d+$/.test(slug)) return null;

  const words = [...new Set(normalizeText(slug.replace(/-/g, ' ')).split(' ').filter(word => word.length >= 3 && !/^\d+$/.test(word)))];
  const { ms, byId: map } = ensureIndex();

  const idMatch = /-(\d+)$/.exec(slug);
  const candidate = idMatch ? map.get(Number(idMatch[1])) : undefined;
  const exact = candidate && normalizeText(candidate.title).split(' ').some(word => words.includes(word)) ? candidate : null;

  const books: SearchableBook[] = [];
  if (words.length > 0) {
    for (const hit of ms.search(words.join(' '), { combineWith: 'OR' })) {
      if (hit.id === exact?.id) continue;
      const book = map.get(hit.id);
      if (book) books.push(book);
      if (books.length >= limit) break;
    }
  }
  return { exact, query: words.join(' '), books };
}

// ── Form options ──────────────────────────────────────────────────────────

export interface Facet { value: string; count: number }

/** Languages and formats present in the catalog with their book counts, most common first. */
export function searchFacets(): { languages: Facet[]; formats: Facet[]; yearMin: number | null; yearMax: number | null } {
  const languages = new Map<string, number>();
  const formats = new Map<string, number>();
  let yearMin: number | null = null;
  let yearMax: number | null = null;
  for (const book of slimAllBooks()) {
    for (const lang of book.languages) languages.set(lang, (languages.get(lang) ?? 0) + 1);
    for (const format of book.formats) formats.set(format, (formats.get(format) ?? 0) + 1);
    if (book.year !== null) {
      yearMin = yearMin === null ? book.year : Math.min(yearMin, book.year);
      yearMax = yearMax === null ? book.year : Math.max(yearMax, book.year);
    }
  }
  const byCount = ([, a]: [string, number], [, b]: [string, number]) => b - a;
  return {
    languages: [...languages].sort(byCount).map(([value, count]) => ({ value, count })),
    formats: [...formats].sort(byCount).map(([value, count]) => ({ value, count })),
    yearMin,
    yearMax,
  };
}
