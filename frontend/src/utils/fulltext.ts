/**
 * Full-text search over the book text (OCR/EPUB), served by Manticore (docker service `manticore`, internal network).
 * Server-side only: the browser never talks to Manticore. Flask writes the index (cps/fulltext_store.py); this file
 * only reads it. The index layout (table, attributes, id scheme) is defined in cps/fulltext.py.
 */

const MANTICORE_URL = (process.env.MANTICORE_URL || '').replace(/\/$/, '');
const TABLE = 'text_chunks';
// Astro answers a page request: a hung socket would hold it, so nothing waits long.
const TIMEOUT_MS = 6000;

export const PAGE_SIZE = 20;
export const MAX_PAGES = 25;
export const MAX_QUERY_LENGTH = 200;
const MAX_QUERY_WORDS = 12;
// A pasted sentence rarely has every word in one passage: from this many plain words on, only QUORUM must match.
const QUORUM_FROM_WORDS = 7;
const QUORUM = 0.6;
// Index order of the `fmt` attribute (cps/fulltext.py: FORMATS).
const FORMATS = ['epub', 'pdf'] as const;

export type TextFormat = (typeof FORMATS)[number];

export class FulltextUnavailable extends Error {}

export interface FulltextHit {
  bookId: number;
  format: TextFormat;
  /** Chunk text with matches wrapped in [ and ]; HTML-escaped by the caller. */
  snippet: string;
  /** Where the passage sits in the book's text, 0 (start) to 100 (end), from its chunk number. */
  progress: number;
}

export interface FulltextResult {
  hits: FulltextHit[];
  /** Exact number of books with at least one matching passage (only the best MAX_PAGES * PAGE_SIZE can be paged). */
  total: number;
  /** The search string that was sent to Manticore, shown so a person can see how the box was read. */
  expression: string;
  /** True when typo tolerance supplied the matches because the exact words matched nothing. */
  fuzzy: boolean;
}

export function fulltextConfigured(): boolean {
  return MANTICORE_URL !== '';
}

/** A `format` query parameter as a filter; anything else means both formats. */
export function parseTextFormat(value: string | null): TextFormat | null {
  const normalized = (value ?? '').toLowerCase();
  return FORMATS.find((format) => format === normalized) ?? null;
}

/**
 * Turn a search box into a Manticore expression, or null when nothing searchable is left. Plain words are all
 * required, "exact phrases" are word sequences, -word and -"phrase" exclude. Every Manticore operator (@, ~, |, !, *,
 * parentheses, /) is removed, so a visitor cannot build a heavy or invalid query. An unclosed quote is read as plain
 * words and a lone "-" is ignored. Mirrors the catalog search syntax in utils/search.ts.
 */
export function matchExpression(raw: string): string | null {
  let text = raw.trim().slice(0, MAX_QUERY_LENGTH);
  if ((text.match(/"/g) ?? []).length % 2 === 1) text = text.replace(/"/g, ' ');
  text = text.replace(/[^\p{L}\p{N}_\s"-]/gu, ' ');
  const plain: string[] = [];
  const phrases: string[] = [];
  const excluded: string[] = [];
  for (const match of text.matchAll(/(-?)"([^"]*)"|(-?)(\S+)/g)) {
    const negative = (match[1] ?? match[3]) === '-';
    if (match[2] !== undefined) {
      const inner = match[2].replace(/-/g, ' ').split(/\s+/).filter(Boolean).join(' ');
      if (!inner) continue;
      (negative ? excluded : phrases).push(`"${inner}"`);
      continue;
    }
    const word = (match[4] ?? '').replace(/"/g, '').replace(/^-+|-+$/g, '');
    if (!word) continue;
    if (negative) excluded.push(word);
    else if (plain.length < MAX_QUERY_WORDS) plain.push(word);
  }
  if (plain.length === 0 && phrases.length === 0) return null;
  const required = plain.length >= QUORUM_FROM_WORDS && phrases.length === 0 && excluded.length === 0
    ? `"${plain.join(' ')}"/${QUORUM}`
    : [...plain, ...phrases].join(' ');
  return [required, ...excluded.map((term) => `-${term}`)].join(' ');
}

const literal = (value: string) => value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

interface SqlAnswer {
  error?: string;
  total?: number;
  data?: Array<Record<string, unknown>>;
}

async function sql(query: string): Promise<SqlAnswer> {
  if (!MANTICORE_URL) throw new FulltextUnavailable('MANTICORE_URL is not set');
  let answer: SqlAnswer;
  try {
    const response = await fetch(`${MANTICORE_URL}/sql?mode=raw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ query }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const payload = (await response.json()) as SqlAnswer | SqlAnswer[];
    answer = Array.isArray(payload) ? payload[0] ?? {} : payload;
  } catch (error) {
    throw new FulltextUnavailable(error instanceof Error ? error.message : String(error));
  }
  if (answer.error) throw new FulltextUnavailable(answer.error);
  return answer;
}

/** The chunk text around the matches, with [ ] around each matched word; empty when the chunk is gone. */
async function snippet(chunkId: number, expression: string): Promise<string> {
  const stored = await sql(`select body from ${TABLE} where id = ${Math.trunc(chunkId)}`);
  const body = stored.data?.[0]?.body;
  if (typeof body !== 'string') return '';
  const shown = await sql(
    `call snippets('${literal(body)}', '${TABLE}', '${literal(expression)}', 180 as around, 1 as limit_passages, ` +
      `'[' as before_match, ']' as after_match)`,
  );
  const text = shown.data?.[0]?.snippet;
  return typeof text === 'string' ? text : '';
}

/** Highest chunk number of each (book, format) among `books`, so a chunk number can be shown as a share of the book. */
async function lastChunks(books: number[]): Promise<Map<string, number>> {
  const last = new Map<string, number>();
  if (books.length === 0) return last;
  const answer = await sql(
    `select book, fmt, max(seq) as last from ${TABLE} where book in (${books.map((book) => Math.trunc(book)).join(',')}) ` +
      `group by book, fmt limit ${books.length * FORMATS.length}`,
  );
  for (const row of answer.data ?? []) last.set(`${Number(row.book)}:${Number(row.fmt)}`, Number(row.last));
  return last;
}

async function run(expression: string, page: number, fuzzy: boolean, format: TextFormat | null): Promise<FulltextResult> {
  // distance=1: every typo I tried ("perburuhn", "demokrasy", "indonesa") is found, while distance=2 made nonsense
  // such as "zzzxqj" or "asdfgh" match a real book.
  const options = `ranker=proximity_bm25${fuzzy ? ', fuzzy=1, distance=1' : ''}`;
  const where = `match('${literal(expression)}')${format ? ` and fmt = ${FORMATS.indexOf(format)}` : ''}`;
  const offset = (Math.max(1, page) - 1) * PAGE_SIZE;
  const [rows, counted] = await Promise.all([
    sql(
      `select id, book, fmt, seq, weight() as score from ${TABLE} where ${where} group by book ` +
        `order by score desc limit ${offset},${PAGE_SIZE} option ${options}`,
    ),
    // Exact number of books with a matching passage (a plain `group by` total is capped at the page size).
    sql(`select count(distinct book) as books from ${TABLE} where ${where} option ${fuzzy ? 'fuzzy=1, distance=1' : 'ranker=none'}`),
  ]);
  const found = rows.data ?? [];
  const [snippets, last] = await Promise.all([
    Promise.all(found.map((row) => snippet(Number(row.id), expression))),
    lastChunks(found.map((row) => Number(row.book))),
  ]);
  const hits = found.map((row, index): FulltextHit => {
    const end = last.get(`${Number(row.book)}:${Number(row.fmt)}`) ?? 0;
    return {
      bookId: Number(row.book),
      format: FORMATS[Number(row.fmt)] ?? 'pdf',
      snippet: snippets[index] ?? '',
      progress: end > 0 ? Math.min(100, Math.round((100 * Number(row.seq)) / end)) : 0,
    };
  });
  return { hits, total: Number(counted.data?.[0]?.books ?? 0), expression, fuzzy };
}

/**
 * Best passage per book for a search box, optionally in one format. When the exact words match nothing the same
 * query is retried with typo tolerance (about 100-250 ms slower), so "perburuhn" still finds "perburuhan"; OCR damage
 * inside the book text cannot be repaired this way.
 */
export async function searchFulltext(raw: string, page: number, format: TextFormat | null = null): Promise<FulltextResult | null> {
  const expression = matchExpression(raw);
  if (expression === null) return null;
  const exact = await run(expression, page, false, format);
  if (exact.total > 0 || page > 1) return exact;
  return run(expression, page, true, format);
}

/** Number of books that can be searched; null when the index cannot be read (the caller just omits the number). */
export async function searchableBooks(): Promise<number | null> {
  try {
    const answer = await sql(`select count(distinct book) as books from ${TABLE} option ranker=none`);
    return Number(answer.data?.[0]?.books ?? 0);
  } catch {
    return null;
  }
}
