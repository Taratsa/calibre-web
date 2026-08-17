import booksIndex from '~/data/books.json';
import legacyBookSlugs from '~/data/legacy-book-slugs.json';

export interface BookLike {
  id: number;
  title: string;
  slug?: string;
  authors: Array<{ id: number; name: string }>;
}

const books = booksIndex as BookLike[];
const slugsById = new Map(books.map((book) => [book.id, book.slug].filter((entry): entry is [number, string] => Boolean(entry[1]))));
const legacyBookIds = legacyBookSlugs as Record<string, number>;

const TRANSLITERATIONS: Record<string, string> = {
  'ı': 'i',
  'ł': 'l',
  'đ': 'd',
  'ð': 'd',
  'þ': 'th',
  'ß': 'ss',
  'æ': 'ae',
  'œ': 'oe',
  'ø': 'o',
  'ħ': 'h',
  'ŋ': 'n',
  'ƒ': 'f',
  'ə': 'e',
};

export function slugify(value: string): string {
  const transliterated = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const replaced = transliterated
    .split('')
    .map((char) => TRANSLITERATIONS[char] ?? char)
    .join('');
  const slug = replaced
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'book';
}

export function bookBaseSlug(book: BookLike): string {
  if (book.slug) return book.slug;
  const parts = [book.title];
  for (const author of book.authors || []) parts.push(author.name);
  return slugify(parts.join(' '));
}

export function bookSlug(book: BookLike): string {
  const storedSlug = slugsById.get(book.id);
  if (storedSlug) return storedSlug;
  const base = bookBaseSlug(book);
  const maxBaseLength = 120;
  const shortened = base.slice(0, maxBaseLength).replace(/-+$/, '') || 'book';
  if (!/^\d+$/.test(base) && base.length <= maxBaseLength) return shortened;
  const suffix = `-${book.id}`;
  return `${shortened.slice(0, maxBaseLength - suffix.length).replace(/-+$/, '')}${suffix}`;
}

export function bookPath(book: BookLike): string {
  return `/book/${bookSlug(book)}`;
}

export function bookByPathSegment(segment: string): BookLike | undefined {
  const legacyBookId = legacyBookIds[segment];
  return books.find((book) => book.slug === segment || book.id === legacyBookId || String(book.id) === segment);
}
