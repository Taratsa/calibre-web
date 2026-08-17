import MiniSearch from 'minisearch';
import booksData from '~/data/books.json';
import { authorPath } from '~/utils/author-url';
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

export function slimAllBooks(): SearchableBook[] {
  if (slimCache) return slimCache;
  slimCache = (booksData as any[]).map(b => ({
    id: b.id,
    title: b.title,
    url: bookPath(b),
    cover_url: b.cover_url,
    authors: (b.authors || []).map((a: any) => ({ id: a.id, name: a.name })),
    tags: b.tags || [],
    publisher: b.publisher ? { id: b.publisher.id, name: b.publisher.name } : null,
    series: b.series ? { id: b.series.id, name: b.series.name, index: b.series.index } : null,
  }));
  return slimCache;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function highlightTerms(text: string, terms: string[]): string {
  if (!terms.length) return escapeHtml(text);
  const escaped = escapeHtml(text);
  const re = new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'gi');
  return escaped.replace(re, '<mark>$1</mark>');
}

function truncateAuthors(authors: Array<{ id: number; name: string }>, max: number): string {
  if (!authors || authors.length === 0) return '';
  const result: Array<{ id: number; name: string }> = [];
  let totalLen = 0;
  let overflow = 0;
  for (let i = 0; i < authors.length; i++) {
    const a = authors[i];
    const addition = a.name.length + (result.length > 0 ? 2 : 0);
    if (result.length > 0 && totalLen + addition > max) {
      overflow = authors.length - i;
      break;
    }
    result.push(a);
    totalLen += addition;
  }
  const links = result
    .map(a => `<a href="${authorPath(a)}">${escapeHtml(a.name)}</a>`)
    .join(', ');
  const more = overflow > 0 ? ` <span class="more">+${overflow}</span>` : '';
  return links + more;
}

function coverHtml(cover_url: string, title: string): string {
  const clean = cover_url.replace(/\?.*$/, '');
  if (clean.startsWith('/cover/') || clean.startsWith('/cover_thumb/')) {
    return `<picture><source srcset="${clean}" type="image/webp"><img src="${clean}" alt="${escapeHtml(title)}" loading="lazy" width="200" height="300" decoding="async"></picture>`;
  }
  return `<img src="${clean}" alt="${escapeHtml(title)}" loading="lazy" width="200" height="300" decoding="async">`;
}

export function renderCards(hits: SearchableBook[], terms: string[]): string {
  return hits.map(h => `
    <li>
      <article class="card">
        <a href="${h.url}" class="card__cover" aria-label="Cover ${escapeHtml(h.title)}">${coverHtml(h.cover_url, h.title)}</a>
        <h3 class="card__title"><a href="${h.url}">${highlightTerms(h.title, terms)}</a></h3>
        <p class="card__authors">${truncateAuthors(h.authors, 60)}</p>
      </article>
    </li>`).join('');
}

interface IndexedDoc extends SearchableBook {
  _authors: string;
  _tags: string;
  _series: string;
  _publisher: string;
}

let indexPromise: Promise<{ ms: MiniSearch<IndexedDoc>; byId: Map<number, SearchableBook> }> | null = null;

function buildIndex(): Promise<{ ms: MiniSearch<IndexedDoc>; byId: Map<number, SearchableBook> }> {
  if (!indexPromise) {
    indexPromise = new Promise(resolve => {
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
      const byId = new Map<number, SearchableBook>();
      for (const b of books) byId.set(b.id, b);
      resolve({ ms, byId });
    });
  }
  return indexPromise;
}

export async function liveSearch(query: string, limit = 60): Promise<SearchableBook[]> {
  const q = query.trim();
  if (!q) return [];
  const { ms, byId } = await buildIndex();
  const raw = ms.search(q);
  const hits: SearchableBook[] = [];
  for (const r of raw) {
    const book = byId.get(r.id as number);
    if (book) hits.push(book);
    if (hits.length >= limit) break;
  }
  return hits;
}
