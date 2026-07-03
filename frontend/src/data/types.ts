export type LangCode = string;

export interface AuthorRef { id: number; name: string }

export interface PublisherRef { id: number; name: string }

export interface Identifier { type: string; value: string }

export interface BookSummary {
  id: number;
  title: string;
  slug: string;
  authors: AuthorRef[];
  author_sort: string | null;
  tags: string[];
  publisher: PublisherRef | null;
  publishers: PublisherRef[];
  languages: LangCode[];
  pubdate: string | null;
  timestamp: string | null;
  last_modified: string | null;
  series: { id: number; name: string; index: number | null } | null;
  identifiers: Identifier[];
  formats: string[];
  cover_url: string;
  cover_og_url: string;
  url: string;
  rating: { avg: number; count: number } | null;
}

export interface BookDataEntry {
  format: string;
  size: number | null;
  name: string;
}

export interface BookDetail extends BookSummary {
  comment: string | null;
  data: BookDataEntry[];
}

export interface Author { id: number; name: string; sort: string }

export interface SeriesEntry { id: number; name: string; sort: string | null }

export interface Publisher { id: number; name: string; sort: string | null }

export interface Category { id: number; name: string }

export interface Language { id: number; lang_code: string }

export interface RatingBucket { id: number; rating: number; count: number }
