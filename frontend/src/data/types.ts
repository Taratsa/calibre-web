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
  has_cover: boolean;
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
  /** Text profile from the corpus rebuild; absent when the book has no cached text. Lists are empty when too short. */
  text?: BookText;
}

export interface BookText {
  /** Words in the book (all tokens, stopwords included). */
  words: number;
  /** Percent of the library's books that have fewer words. */
  longer_than: number;
  /** [word, count]: most frequent non-stopwords. */
  top: [string, number][];
  /** [word, count]: words that are frequent here but rare in the other books (count x log(books / books using it)). */
  distinct: [string, number][];
  /** [phrase, count]: key two- and three-word phrases. */
  phrases: [string, number][];
  /** [book id, similarity 0-1]: the most similar books by distinctive words, best first; empty when none is close enough. */
  similar: [number, number][];
  /**
   * Tone of the words from the corpus rebuild: (positive - negative) / hits, in [-1, 1], plus the weighted hit counts.
   * Null for books that are not scored (non-Indonesian language, or fewer than SENTIMENT_MIN_HITS hits).
   */
  sentiment: {
    score: number;
    positive: number;
    negative: number;
    /** 16 sections from start to end of the book; null where a section had too few polarity words. */
    trend: (number | null)[];
    /** [emotion code, weighted hits], most frequent first; empty when the book has too few emotion words. */
    emotions: [string, number][];
  } | null;
}

export interface Author { id: number; name: string; sort: string }

/** Word cloud of an author's books (author pages). */
export interface AuthorText {
  /** Books of the author that have text. */
  books: number;
  /** [word, count, books using it]: the author's characteristic words, best first. */
  cloud: [string, number, number][];
}

export interface SeriesEntry { id: number; name: string; sort: string | null }

export interface Publisher { id: number; name: string; sort: string | null }

export interface Category { id: number; name: string }

export interface Language { id: number; lang_code: string }

export interface RatingBucket { id: number; rating: number; count: number }
