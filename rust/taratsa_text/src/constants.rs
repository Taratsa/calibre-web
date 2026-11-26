//! Tuning constants, mirroring `cps/text_analysis.py`; `test/test_text_analysis_parity.py` asserts they stay equal.

/// Words of the stopword-free word cloud, and the shortest word it (and the edges of an n-gram) may show.
pub const CLOUD_WORDS: usize = 100;
pub const CLOUD_MIN_LENGTH: u32 = 3;
/// Per-book text profile (book pages).
pub const BOOK_WORDS: usize = 12;
pub const BOOK_WORD_MIN_COUNT: u32 = 3;
pub const BOOK_WORDS_MIN_SHOWN: usize = 8;
pub const BOOK_CANDIDATES: usize = 200;
pub const BOOK_PHRASES: usize = 8;
pub const BOOK_PHRASE_MIN_COUNT: u32 = 3;
pub const BOOK_PHRASES_MIN_SHOWN: usize = 3;
/// Author pages.
pub const AUTHOR_WORDS: usize = 40;
pub const AUTHOR_MIN_BOOKS: usize = 2;
pub const AUTHOR_WORD_MIN_BOOKS: u32 = 2;
pub const AUTHOR_WORD_MIN_SHARE: f64 = 0.25;
pub const AUTHOR_WORDS_MIN_SHOWN: usize = 12;
/// Similar books.
pub const SIMILAR_BOOKS: usize = 10;
pub const SIMILAR_BOOKS_MIN_SHOWN: usize = 3;
pub const SIMILAR_MIN_SCORE: f64 = 0.10;
pub const SIMILAR_MAX_SCORE: f64 = 0.85;
pub const SIMILAR_MAX_DOCUMENT_SHARE: f64 = 0.10;
/// An n-gram seen once never reaches the ranking.
pub const MIN_NGRAM_COUNT: u32 = 2;
pub const MTLD_THRESHOLD: f64 = 0.72;
/// MTLD of a very short text is dominated by chance.
pub const MTLD_MIN_TOKENS: usize = 1000;
pub const MAX_NGRAM_ENTRIES: usize = 1_000_000;
/// Upper bound on tokenizer threads in `add_many`; the pool also leaves one core free for the web loop.
pub const TOKENIZE_THREADS: usize = 6;
/// Corpus overview.
pub const CORPUS_WORDS: usize = 50;
pub const CORPUS_NGRAMS: usize = 30;
pub const LENGTH_BIN_EDGES: [u64; 4] = [1_000, 5_000, 20_000, 100_000];
/// A tone score needs this many polarity hits before the ratio means anything.
pub const SENTIMENT_MIN_HITS: u64 = 50;
/// Sections of a book for the tone trend, and the hits a section needs before its value is shown.
pub const SENTIMENT_TREND_BUCKETS: usize = 16;
pub const SENTIMENT_TREND_MIN_HITS: u64 = 5;
/// Emotion labels need this many emotion hits before the top three are shown.
pub const SENTIMENT_EMOTION_MIN_HITS: u64 = 30;
/// A trend with fewer scored sections than this is not drawn.
pub const SENTIMENT_TREND_MIN_SHOWN: usize = 8;
/// Sentence-level sentiment sample: at most this many sentences per book (uniform random, deterministic per book).
/// 60 x ~20.7k books is ~1.2M sentences: about two days at the measured ~6 sentences/s of the fp32 model.
pub const SENTIMENT_SAMPLE: usize = 60;
/// A book needs this many scored sample sentences before its transformer tone is shown.
pub const SENTIMENT_SAMPLE_MIN: usize = 30;
