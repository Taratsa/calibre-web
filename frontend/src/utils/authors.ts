import { authorPath } from './author-url';

export interface AuthorRef { id: number; name: string }

interface TruncatedAuthors {
  items: AuthorRef[];
  overflow: number;
}

export function truncateAuthors(
  authors: AuthorRef[],
  max: number = 60,
): TruncatedAuthors {
  if (!authors || authors.length === 0) {
    return { items: [], overflow: 0 };
  }
  const result: AuthorRef[] = [];
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
  return { items: result, overflow };
}

export function truncateAuthorsHtml(
  authors: AuthorRef[],
  max: number = 60,
): string {
  const { items, overflow } = truncateAuthors(authors, max);
  const links = items
    .map(a => `<a href="${authorPath(a)}">${escapeHtml(a.name)}</a>`)
    .join(', ');
  const more = overflow > 0 ? ` <span class="more">+${overflow}</span>` : '';
  return links + more;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
