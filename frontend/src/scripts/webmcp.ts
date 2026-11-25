// WebMCP (https://webmachinelearning.github.io/webmcp/): exposes the site's key actions to
// in-browser agents. Tools read the same public SSR pages a visitor sees (no extra endpoint,
// no auth), so an agent can do nothing a person could not.

interface ToolAnnotations {
  readOnlyHint?: boolean;
  untrustedContentHint?: boolean;
  consequentialHint?: boolean;
}
interface ModelContextTool {
  name: string;
  title?: string;
  description: string;
  inputSchema?: object;
  annotations?: ToolAnnotations;
  execute: (input: Record<string, unknown>) => Promise<unknown>;
}
interface ModelContext {
  registerTool: (tool: ModelContextTool, options?: { signal?: AbortSignal }) => unknown;
}

// The API is not in lib.dom yet. Early Chrome builds expose it on navigator, the current
// draft on document.
declare global {
  interface Navigator {
    modelContext?: ModelContext;
  }
  interface Document {
    modelContext?: ModelContext;
  }
}

const SECTIONS: Record<string, { path: string; description: string }> = {
  home: { path: '/', description: 'Beranda: buku terbaru' },
  all_books: { path: '/page/', description: 'Semua buku' },
  popular: { path: '/populer/', description: 'Buku paling banyak diunduh' },
  authors: { path: '/author/', description: 'Daftar penulis' },
  series: { path: '/series/', description: 'Daftar seri' },
  publishers: { path: '/publisher/', description: 'Daftar penerbit' },
  categories: { path: '/category/', description: 'Daftar kategori' },
  languages: { path: '/language/', description: 'Daftar bahasa' },
  shelves: { path: '/shelf/', description: 'Rak (koleksi pilihan)' },
  clippings: { path: '/kliping/', description: 'Kliping koran dan majalah' },
  videos: { path: '/video/', description: 'Video' },
  data: { path: '/data/', description: 'Statistik koleksi dan teks' },
  about: { path: '/about/', description: 'Tentang Pustaka Taratsa' },
  advanced_search: { path: '/search/?advanced=1', description: 'Formulir pencarian lanjutan' },
};

const MAX_QUERY = 200;
// A navigation unloads the document, which aborts an execution still pending: answer first,
// then navigate.
const NAVIGATE_DELAY_MS = 300;

const clean = (value: unknown, max = MAX_QUERY): string =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

const text = (el: Element | null): string => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

function isSitePath(path: string): boolean {
  if (!path.startsWith('/') || path.startsWith('//')) return false;
  try {
    return new URL(path, window.location.origin).origin === window.location.origin;
  } catch {
    return false;
  }
}

async function fetchDocument(path: string): Promise<Document> {
  const response = await fetch(path, { credentials: 'same-origin', headers: { Accept: 'text/html' } });
  if (!response.ok) throw new Error(`Permintaan gagal (HTTP ${response.status})`);
  return new DOMParser().parseFromString(await response.text(), 'text/html');
}

function readBookCards(doc: Document): { title: string; authors: string; url: string }[] {
  return Array.from(doc.querySelectorAll('.book-card')).map((card) => {
    const link = card.querySelector<HTMLAnchorElement>('.book-card__title a');
    const href = link?.getAttribute('href') ?? '';
    return {
      title: text(link),
      authors: text(card.querySelector('.book-card__authors')),
      url: href ? new URL(href, window.location.origin).toString() : '',
    };
  });
}

function buildTools(): ModelContextTool[] {
  return [
    {
      name: 'search_catalog',
      title: 'Cari katalog buku',
      description:
        'Search the library catalog (titles, authors, categories, series, publishers). Returns up to 48 books per page ' +
        'with title, authors and URL. Main query syntax: "exact phrase" and -word to exclude. ' +
        'Field filters (title, author, publisher, series, tag) are exact-prefix. Language is an ISO 639-2 code as stored ' +
        '(ind, eng, msa). To search inside the book text use search_book_text.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Free-text query, max 200 characters.' },
          title: { type: 'string', description: 'Only titles starting with this text.' },
          author: { type: 'string', description: 'Only authors starting with this text.' },
          publisher: { type: 'string', description: 'Only publishers starting with this text.' },
          series: { type: 'string', description: 'Only series starting with this text.' },
          tag: { type: 'string', description: 'Only categories (tags) starting with this text.' },
          language: { type: 'string', description: 'ISO 639-2 language code, e.g. ind, eng, msa.' },
          format: { type: 'string', description: 'File format, e.g. pdf or epub.' },
          yearFrom: { type: 'integer', minimum: 1000, maximum: 2100, description: 'First publication year. Books without a reliable year are excluded.' },
          yearTo: { type: 'integer', minimum: 1000, maximum: 2100, description: 'Last publication year.' },
          sort: { type: 'string', enum: ['relevance', 'newest', 'title', 'year'], description: 'Result order. Default relevance.' },
          page: { type: 'integer', minimum: 1, description: 'Result page, 48 books per page. Default 1.' },
        },
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      async execute(input) {
        const params = new URLSearchParams();
        const fields: [string, unknown][] = [
          ['q', input.query],
          ['title', input.title],
          ['author', input.author],
          ['publisher', input.publisher],
          ['series', input.series],
          ['tag', input.tag],
          ['lang', input.language],
          ['format', input.format],
        ];
        for (const [key, value] of fields) {
          const v = clean(value);
          if (v) params.set(key, v);
        }
        if (typeof input.yearFrom === 'number' && Number.isInteger(input.yearFrom)) params.set('from', String(input.yearFrom));
        if (typeof input.yearTo === 'number' && Number.isInteger(input.yearTo)) params.set('to', String(input.yearTo));
        if (params.size === 0) throw new Error('Isi query atau minimal satu filter.');
        if (typeof input.sort === 'string' && input.sort !== 'relevance') params.set('sort', input.sort);
        if (typeof input.page === 'number' && Number.isInteger(input.page) && input.page > 1) params.set('page', String(input.page));
        const path = `/search/?${params.toString()}`;
        const doc = await fetchDocument(path);
        return {
          url: new URL(path, window.location.origin).toString(),
          summary: text(doc.getElementById('search-status')) || 'Tidak ada hasil.',
          pager: text(doc.querySelector('.search-pager__where')) || null,
          books: readBookCards(doc),
        };
      },
    },
    {
      name: 'search_book_text',
      title: 'Cari di dalam teks buku',
      description:
        'Search the full text of the books (OCR/EPUB text) and open the result page, which shows the best passage per book ' +
        'with highlighted matches. All words must be in one passage. Syntax: "exact phrase", -word. This navigates the browser ' +
        'to the results page.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Words or "exact phrase" to find, max 200 characters.' },
          format: { type: 'string', enum: ['pdf', 'epub'], description: 'Limit to one file format. Default both.' },
        },
        required: ['query'],
      },
      annotations: { readOnlyHint: true },
      async execute(input) {
        const q = clean(input.query);
        if (!q) throw new Error('query wajib diisi.');
        const params = new URLSearchParams({ q });
        if (input.format === 'pdf' || input.format === 'epub') params.set('format', input.format);
        const path = `/search/text/?${params.toString()}`;
        window.setTimeout(() => window.location.assign(path), NAVIGATE_DELAY_MS);
        return { navigatingTo: new URL(path, window.location.origin).toString() };
      },
    },
    {
      name: 'list_sections',
      title: 'Daftar bagian situs',
      description: 'List the main sections of the site with their URLs, to use with navigate.',
      inputSchema: { type: 'object', properties: {} },
      annotations: { readOnlyHint: true },
      async execute() {
        return Object.entries(SECTIONS).map(([name, section]) => ({
          name,
          description: section.description,
          url: new URL(section.path, window.location.origin).toString(),
        }));
      },
    },
    {
      name: 'navigate',
      title: 'Buka halaman',
      description:
        'Open a section of the site (see list_sections) or any path on this site, e.g. a book URL returned by search_catalog. ' +
        'Pass exactly one of section or path. The browser navigates to the page.',
      inputSchema: {
        type: 'object',
        properties: {
          section: { type: 'string', enum: Object.keys(SECTIONS), description: 'A named section.' },
          path: { type: 'string', description: 'A path on this site, starting with "/", e.g. /book/123/.' },
        },
      },
      annotations: { readOnlyHint: true },
      async execute(input) {
        const section = typeof input.section === 'string' ? SECTIONS[input.section] : undefined;
        const path = section ? section.path : clean(input.path, 500);
        if (!path) throw new Error('Isi section atau path.');
        if (!isSitePath(path)) throw new Error('path harus berupa alamat di situs ini, diawali "/".');
        window.setTimeout(() => window.location.assign(path), NAVIGATE_DELAY_MS);
        return { navigatingTo: new URL(path, window.location.origin).toString() };
      },
    },
    {
      name: 'get_page_content',
      title: 'Baca halaman ini',
      description:
        'Describe the page the user is on: URL, title, meta description, headings, and the books listed on it ' +
        '(title, authors, URL). Use it to read a book page or a listing before acting.',
      inputSchema: { type: 'object', properties: {} },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      async execute() {
        const main = document.querySelector('main') ?? document.body;
        return {
          url: window.location.href,
          title: document.title,
          description: document.querySelector('meta[name="description"]')?.getAttribute('content') ?? null,
          headings: Array.from(main.querySelectorAll('h1, h2, h3'))
            .slice(0, 30)
            .map((h) => text(h))
            .filter(Boolean),
          books: readBookCards(document).slice(0, 60),
        };
      },
    },
  ];
}

// One controller owns every registration; aborting it unregisters all tools.
let controller: AbortController | null = null;

function registerAll(): void {
  const modelContext = navigator.modelContext ?? document.modelContext;
  if (!modelContext || typeof modelContext.registerTool !== 'function') return;
  controller?.abort();
  const own = new AbortController();
  controller = own;
  for (const tool of buildTools()) {
    try {
      // registerTool may reject (e.g. duplicate name); never break the page.
      Promise.resolve(modelContext.registerTool(tool, { signal: own.signal })).catch(() => {});
    } catch {
      // Unsupported shape in an older implementation: skip the tool.
    }
  }
}

registerAll();
// The page may enter the back/forward cache: unregister when it leaves, register again when
// it is restored (a restored page does not re-run this module).
window.addEventListener('pagehide', () => controller?.abort());
window.addEventListener('pageshow', (event) => {
  if (event.persisted) registerAll();
});

export {};
