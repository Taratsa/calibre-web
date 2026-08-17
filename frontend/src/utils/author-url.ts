import { slugify as transliterateSlug } from './book-url';
import authorsIndex from '~/data/authors.json';

export interface AuthorLike {
  id: number;
  name: string;
}

const authors = authorsIndex as AuthorLike[];
const authorSlugs = new Map<number, string>();
const authorBySlug = new Map<string, AuthorLike>();
const authorBases = authors.map((author) => ({ author, base: slugify(author.name) }));
for (const { author, base } of authorBases) {
  const maxBaseLength = 96;
  const shortened = base.slice(0, maxBaseLength).replace(/-+$/, '') || 'author';
  const collision = authorBases.some((other) => other.author.id !== author.id && (other.base === base || other.base.slice(0, maxBaseLength).replace(/-+$/, '') === shortened));
  const slug = !/^\d+$/.test(base) && !collision && base.length <= maxBaseLength
    ? shortened
    : `${shortened.slice(0, maxBaseLength - String(author.id).length - 1).replace(/-+$/, '')}-${author.id}`;
  authorSlugs.set(author.id, slug);
  authorBySlug.set(slug, author);
}

export function slugify(value: string): string {
  return transliterateSlug(value) || 'author';
}

export function authorSlug(author: AuthorLike): string {
  return authorSlugs.get(author.id) || slugify(author.name);
}

export function authorPath(author: AuthorLike): string {
  return `/author/${authorSlug(author)}`;
}

export function authorByPathSegment(segment: string): AuthorLike | undefined {
  return authorBySlug.get(segment);
}
