import { getAllAuthors, getAllBooks, getAllCategories, getAllLanguages, getAllPublishers, getAllSeries, getShelves } from '~/data';
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

const STATIC_PATHS = [
  '/',
  '/about/',
  '/author/',
  '/category/',
  '/formats/',
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

export function getSitemapEntries(): SitemapEntry[] {
  const entries = new Map<string, SitemapEntry>();

  for (const path of STATIC_PATHS) addEntry(entries, path);
  for (const book of getAllBooks()) {
    const cover = imageUrl(book.cover_og_url);
    addEntry(entries, bookPath(book), dateOnly(book.last_modified), cover ? [cover] : undefined);
  }
  for (const author of getAllAuthors()) addEntry(entries, authorPath(author));
  for (const category of getAllCategories()) addEntry(entries, `/category/${category.id}`);
  for (const language of getAllLanguages()) addEntry(entries, `/language/${encodeURIComponent(language.lang_code)}`);
  for (const publisher of getAllPublishers()) addEntry(entries, `/publisher/${publisher.id}`);
  for (const series of getAllSeries()) addEntry(entries, `/series/${series.id}`);
  for (const shelf of getShelves()) addEntry(entries, `/shelf/${shelf.id}`);
  for (const video of videos) addEntry(entries, `/video/${encodeURIComponent(video.id)}`);

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
    `<sitemap><loc>${escapeXml(absoluteUrl(`/sitemaps/${index}.xml`))}</loc></sitemap>`
  ).join('');
  return `${XML_HEADER}<sitemapindex xmlns="${SITEMAP_NAMESPACE}">${entries}</sitemapindex>\n`;
}
