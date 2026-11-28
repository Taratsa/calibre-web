import { getAllAuthors, getAllBooks, getAllCategories, getAllLanguages, getAllPublishers, getAllSeries, getShelves } from '~/data';
import { clippings, clippingPath } from '~/data/clippings';
import ocrReady from '~/data/ocr-ready.json';
import fileUrls from '~/data/file-urls.json';
import { videos } from '~/data/videos';
import { authorPath } from './author-url';
import { bookPath } from './book-url';

export const SITE_URL = 'https://pustaka.taratsa.id';
const SITEMAP_NAMESPACE = 'http://www.sitemaps.org/schemas/sitemap/0.9';
const IMAGE_NAMESPACE = 'http://www.google.com/schemas/sitemap-image/1.1';
const MAX_URLS_PER_SITEMAP = 50_000;
const MAX_SITEMAP_BYTES = 50_000_000;
const XML_HEADER = '<?xml version="1.0" encoding="UTF-8"?>';
const URLSET_PREFIX = `${XML_HEADER}<urlset xmlns="${SITEMAP_NAMESPACE}" xmlns:image="${IMAGE_NAMESPACE}">`;
const URLSET_SUFFIX = '</urlset>';

export interface SitemapEntry {
  loc: string;
  lastmod?: string;
  images?: string[];
}

export type SitemapChunk = SitemapEntry[];

const OCR_FORMATS = ['epub', 'pdf'];

const STATIC_PATHS = [
  '/',
  '/about/',
  '/aksesibilitas/',
  '/author/',
  '/data/',
  '/category/',
  '/formats/',
  '/kliping/',
  '/language/',
  '/page/',
  '/populer/',
  '/publisher/',
  '/ratings/',
  '/series/',
  '/shelf/',
  '/video/',
];

function absoluteUrl(path: string): string {
  const url = new URL(path, SITE_URL);
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  return url.href;
}

function dateOnly(value: string | null | undefined): string | undefined {
  const date = value?.slice(0, 10);
  return date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function addEntry(
  entries: Map<string, SitemapEntry>,
  path: string,
  lastmod?: string,
  images?: string[],
): void {
  const loc = absoluteUrl(path);
  if (!entries.has(loc)) entries.set(loc, { loc, lastmod, images });
}

function imageUrl(path: string): string | undefined {
  if (!path.startsWith('/cover/')) return undefined;
  const url = new URL(path, SITE_URL);
  url.searchParams.delete('v');
  return url.href;
}

// Per format, book id -> date (YYYY-MM-DD) the cached text was last written; see loadReadyOcr() in seed.mjs.
const readyOcrDates = ocrReady as { pdf: Record<string, string>; epub: Record<string, string> };

export function getSitemapEntries(): SitemapEntry[] {
  const entries = new Map<string, SitemapEntry>();

  for (const path of STATIC_PATHS) addEntry(entries, path);
  for (const book of getAllBooks()) {
    // Only a real cover goes into the image sitemap. A book without one is served a generated title card
    // (cps/cover_placeholder.py) at the same URL, which is text on grey, not a picture worth indexing.
    const cover = book.has_cover ? imageUrl(book.cover_og_url) : undefined;
    addEntry(entries, bookPath(book), dateOnly(book.last_modified), cover ? [cover] : undefined);
    // Only books whose text is already cached have an indexable reader page; the rest render a noindex stub. That
    // page's content is the cached text, so its lastmod is the date the text was written, not the book's.
    for (const format of OCR_FORMATS) {
      const textDate = readyOcrDates[format as 'pdf' | 'epub'][String(book.id)];
      if (textDate) addEntry(entries, `/read/${book.id}/ocr/${format}`, dateOnly(textDate));
    }
  }
  for (const author of getAllAuthors()) addEntry(entries, authorPath(author));
  for (const category of getAllCategories()) addEntry(entries, `/category/${category.id}`);
  for (const language of getAllLanguages()) addEntry(entries, `/language/${encodeURIComponent(language.lang_code)}`);
  for (const publisher of getAllPublishers()) addEntry(entries, `/publisher/${publisher.id}`);
  for (const series of getAllSeries()) addEntry(entries, `/series/${series.id}`);
  for (const shelf of getShelves()) addEntry(entries, `/shelf/${shelf.id}`);
  for (const clipping of clippings) addEntry(entries, clippingPath(clipping.id), /^\d{4}-\d{2}-\d{2}$/.test(clipping.date) ? clipping.date : undefined);
  for (const video of videos) addEntry(entries, `/video/${encodeURIComponent(video.id)}`);
  // Canonical PDF/EPUB URLs, the target of the Link: rel="canonical" header on /files and /show.
  // Added directly: addEntry would append a trailing slash these URLs do not have.
  for (const file of fileUrls as { url: string; lastmod?: string }[]) {
    const loc = `${SITE_URL}${file.url}`;
    entries.set(loc, { loc, lastmod: file.lastmod });
  }
  return [...entries.values()].sort((a, b) => a.loc.localeCompare(b.loc));
}

function renderEntry(entry: SitemapEntry): string {
  const lastmod = entry.lastmod ? `<lastmod>${escapeXml(entry.lastmod)}</lastmod>` : '';
  const images = (entry.images || [])
    .map((image) => `<image:image><image:loc>${escapeXml(image)}</image:loc></image:image>`)
    .join('');
  return `<url><loc>${escapeXml(entry.loc)}</loc>${lastmod}${images}</url>`;
}

export function renderSitemap(entries: SitemapEntry[]): string {
  return `${URLSET_PREFIX}${entries.map(renderEntry).join('')}${URLSET_SUFFIX}\n`;
}

export function getSitemapChunks(entries = getSitemapEntries()): SitemapChunk[] {
  const chunks: SitemapChunk[] = [];
  const encoder = new TextEncoder();
  let chunk: SitemapChunk = [];
  let bytes = encoder.encode(`${URLSET_PREFIX}${URLSET_SUFFIX}\n`).byteLength;

  for (const entry of entries) {
    const entryBytes = encoder.encode(renderEntry(entry)).byteLength;
    const wouldExceedLimits = chunk.length >= MAX_URLS_PER_SITEMAP
      || (chunk.length > 0 && bytes + entryBytes > MAX_SITEMAP_BYTES);
    if (wouldExceedLimits) {
      chunks.push(chunk);
      chunk = [];
      bytes = encoder.encode(`${URLSET_PREFIX}${URLSET_SUFFIX}\n`).byteLength;
    }
    chunk.push(entry);
    bytes += entryBytes;
  }

  if (chunk.length > 0) chunks.push(chunk);
  return chunks;
}

let cachedSitemapChunks: SitemapChunk[] | undefined;

export function getCachedSitemapChunks(): SitemapChunk[] {
  if (!cachedSitemapChunks) cachedSitemapChunks = getSitemapChunks();
  return cachedSitemapChunks;
}

export function renderSitemapIndex(chunkCount: number): string {
  const entries = Array.from({ length: chunkCount }, (_, index) =>
    `<sitemap><loc>${escapeXml(new URL(`/sitemaps/${index}.xml`, SITE_URL).href)}</loc></sitemap>`
  ).join('');
  return `${XML_HEADER}<sitemapindex xmlns="${SITEMAP_NAMESPACE}">${entries}</sitemapindex>\n`;
}
