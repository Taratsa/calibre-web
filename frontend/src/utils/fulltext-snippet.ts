// Rendering helpers shared by the two pages that show full-text passages: /search/text/ and the catalog fallback on /search/.

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * The snippet is plain text with [ ] around matches (the book text itself may contain brackets, so those that are
 * not Manticore's are rare but possible: the worst case is an extra <mark> around a bracketed word).
 */
export const highlight = (snippet: string) =>
  escapeHtml(snippet).replace(/\[([^\[\]]+)\]/g, '<mark>$1</mark>').replace(/^\s*\.\.\.\s*/, '… ').replace(/\s*\.\.\.\s*$/, ' …');

/** Where in the book a passage sits, in words. `progress` is 0 (start) to 100 (end). */
export const where = (progress: number) =>
  progress <= 2 ? 'awal buku' : progress >= 98 ? 'akhir buku' : `sekitar ${progress}% dari buku`;
