import type { BookSummary, BookDetail, Author, SeriesEntry, Publisher, Category, Language, RatingBucket } from './types';

import booksIndex from '~/data/books.json';
import authorsIndex from '~/data/authors.json';
import seriesIndex from '~/data/series.json';
import publishersIndex from '~/data/publishers.json';
import categoriesIndex from '~/data/categories.json';
import languagesIndex from '~/data/languages.json';
import ratingsIndex from '~/data/ratings.json';
import shelvesIndex from '~/data/shelves.json';

export function getAllBooks(): BookSummary[] {
  return booksIndex as BookSummary[];
}

export function getAllAuthors(): Author[] {
  return authorsIndex as Author[];
}

export function getAllSeries(): SeriesEntry[] {
  return seriesIndex as SeriesEntry[];
}

export function getAllPublishers(): Publisher[] {
  return publishersIndex as Publisher[];
}

export function getAllCategories(): Category[] {
  return categoriesIndex as Category[];
}

export function getAllLanguages(): Language[] {
  return languagesIndex as Language[];
}

export function getAllRatings(): RatingBucket[] {
  return ratingsIndex as RatingBucket[];
}

export interface ShelfSummary { id: number; name: string; book_ids: number[] }

export function getShelves(): ShelfSummary[] {
  return shelvesIndex as ShelfSummary[];
}

export function booksByAuthor(authorId: number): BookSummary[] {
  return getAllBooks().filter(b => b.authors.some(a => a.id === authorId));
}
export function booksBySeries(seriesId: number): BookSummary[] {
  return getAllBooks().filter(b => b.series && b.series.id === seriesId);
}
export function booksByPublisher(publisherId: number): BookSummary[] {
  return getAllBooks().filter(b => b.publishers.some(p => p.id === publisherId));
}
export function booksByCategory(categoryName: string): BookSummary[] {
  return getAllBooks().filter(b => b.tags.includes(categoryName));
}
export function booksByCategoryId(categoryId: number): BookSummary[] {
  const cat = getCategoryById(categoryId);
  return cat ? booksByCategory(cat.name) : [];
}
export function getCategoryById(id: number): Category | undefined {
  return getAllCategories().find(c => c.id === id);
}
export function booksByLanguage(langCode: string): BookSummary[] {
  return getAllBooks().filter(b => b.languages.includes(langCode));
}
export function booksByFormat(format: string): BookSummary[] {
  return getAllBooks().filter(b => b.formats.includes(format.toLowerCase()));
}
export function booksByRating(ratingId: number): BookSummary[] {
  const r = getAllRatings().find(x => x.id === ratingId);
  if (!r) return [];
  return getAllBooks().filter(b => b.rating && Math.round(b.rating.avg) === r.rating);
}

export const PAGE_SIZE = 30;

export function paginate<T>(items: T[], page: number, size: number = PAGE_SIZE) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * size;
  return {
    items: items.slice(start, start + size),
    page: safePage,
    totalPages,
    total,
  };
}

export function ogLocale(code: string): string {
  const map: Record<string, string> = {
    id: 'id_ID',
    en: 'en_US',
    jv: 'jv_ID',
    su: 'su_ID',
    ms: 'ms_MY',
    nl: 'nl_NL',
  };
  return map[code] || code;
}

export function localeLanguageName(code: string): string {
  const map: Record<string, string> = {
    id: 'Bahasa Indonesia',
    en: 'English',
    jv: 'Basa Jawa',
    su: 'Basa Sunda',
    nl: 'Nederlands',
    ms: 'Bahasa Melayu',
  };
  return map[code] || code;
}

export function formatBytes(n: number | null | undefined): string {
  if (!n || n <= 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v >= 10 ? 0 : 1)} ${units[i]}`;
}

export function readableFormats(formats: string[]): string[] {
  return Array.from(new Set(formats.map(f => f.toLowerCase()))).sort();
}
