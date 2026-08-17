import type { BookSummary, BookDetail, Author, SeriesEntry, Publisher, Category, Language, RatingBucket } from './types';

import booksIndex from '~/data/books.json';
import authorsIndex from '~/data/authors.json';
import seriesIndex from '~/data/series.json';
import publishersIndex from '~/data/publishers.json';
import categoriesIndex from '~/data/categories.json';
import languagesIndex from '~/data/languages.json';
import ratingsIndex from '~/data/ratings.json';
import shelvesIndex from '~/data/shelves.json';
import popularIndex from '~/data/popular.json';

export function getAllBooks(): BookSummary[] {
  return booksIndex as BookSummary[];
}
const books = booksIndex as BookSummary[];
const booksByAuthorIndex = new Map<number, BookSummary[]>();
const booksBySeriesIndex = new Map<number, BookSummary[]>();
const booksByPublisherIndex = new Map<number, BookSummary[]>();
const booksByCategoryIndex = new Map<string, BookSummary[]>();
const booksByLanguageIndex = new Map<string, BookSummary[]>();
for (const book of books) {
  for (const author of book.authors) (booksByAuthorIndex.get(author.id) ?? (booksByAuthorIndex.set(author.id, []), booksByAuthorIndex.get(author.id)!)).push(book);
  if (book.series) (booksBySeriesIndex.get(book.series.id) ?? (booksBySeriesIndex.set(book.series.id, []), booksBySeriesIndex.get(book.series.id)!)).push(book);
  for (const publisher of book.publishers) (booksByPublisherIndex.get(publisher.id) ?? (booksByPublisherIndex.set(publisher.id, []), booksByPublisherIndex.get(publisher.id)!)).push(book);
  for (const category of book.tags) (booksByCategoryIndex.get(category) ?? (booksByCategoryIndex.set(category, []), booksByCategoryIndex.get(category)!)).push(book);
  for (const language of book.languages) (booksByLanguageIndex.get(language) ?? (booksByLanguageIndex.set(language, []), booksByLanguageIndex.get(language)!)).push(book);
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

interface PopularEntry { book_id: number; total_downloads: number }

export function getPopularBooks(): BookSummary[] {
  const allBooks = getAllBooks();
  const bookMap = new Map<number, BookSummary>(allBooks.map(b => [b.id, b]));
  const popular = popularIndex as PopularEntry[];
  return popular
    .map(p => bookMap.get(p.book_id))
    .filter((b): b is BookSummary => b !== undefined);
}

export function booksByAuthor(authorId: number): BookSummary[] {
  return booksByAuthorIndex.get(authorId) || [];
}
export function booksBySeries(seriesId: number): BookSummary[] {
  return booksBySeriesIndex.get(seriesId) || [];
}
export function booksByPublisher(publisherId: number): BookSummary[] {
  return booksByPublisherIndex.get(publisherId) || [];
}
export function booksByCategory(categoryName: string): BookSummary[] {
  return booksByCategoryIndex.get(categoryName) || [];
}
export function booksByCategoryId(categoryId: number): BookSummary[] {
  const cat = getCategoryById(categoryId);
  return cat ? booksByCategory(cat.name) : [];
}
export function getCategoryById(id: number): Category | undefined {
  return getAllCategories().find(c => c.id === id);
}
export function booksByLanguage(langCode: string): BookSummary[] {
  return booksByLanguageIndex.get(langCode) || [];
}
export function booksByFormat(format: string): BookSummary[] {
  const normalized = format.toLowerCase();
  return books.filter(book => book.formats.includes(normalized));
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
