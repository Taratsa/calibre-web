const DAY_MS = 86_400_000;
// Calibre fills `pubdate` with the import date when a book has no real publication date. A date that is
// within this window before the import timestamp (or after it) is treated as that placeholder.
const PLACEHOLDER_WINDOW_DAYS = 31;

interface PubdateSource {
  pubdate: string | null;
  timestamp: string | null;
}

/** The publication date to expose in structured data, or null when it looks like an import-date placeholder. */
export function reliablePubdate(book: PubdateSource): string | null {
  const { pubdate, timestamp } = book;
  if (!pubdate || pubdate === '0101-01-01') return null;
  const published = Date.parse(pubdate.slice(0, 10));
  if (Number.isNaN(published)) return null;
  const imported = timestamp ? Date.parse(timestamp.slice(0, 10)) : Number.NaN;
  if (Number.isNaN(imported)) return pubdate;
  return imported - published <= PLACEHOLDER_WINDOW_DAYS * DAY_MS ? null : pubdate;
}
