//! Python bindings for the corpus text analysis: one `CorpusBuilder` class and the `html_to_blocks` helper.

mod constants;
mod corpus;
mod sentiment;
mod text;
use std::collections::HashSet;

use pyo3::prelude::*;
use pyo3::types::PyDict;

use crate::corpus::{BatchDocument, Builder, LanguageWords, SentimentConfig};

#[pyclass(name = "CorpusBuilder", module = "taratsa_text")]
struct PyCorpusBuilder {
    builder: Builder,
}

#[pymethods]
impl PyCorpusBuilder {
    /// `stopwords` and `sentiment` are passed in by `cps/text_analysis.py`, which owns the data files; the crate never
    /// loads config.
    #[new]
    fn new(
        stopwords: HashSet<String>,
        sentiment: SentimentConfig,
        language: LanguageWords,
    ) -> Self {
        Self {
            builder: Builder::new(
                stopwords.into_iter().map(Box::from).collect(),
                sentiment,
                language,
            ),
        }
    }

    /// Add one document (reader HTML); False when it holds no words. The parser and counters run with the GIL
    /// released, so a long build does not stall the gevent web loop.
    #[pyo3(signature = (markup, book_format, book_id=None, authors=None, languages=None))]
    fn add(
        &mut self,
        py: Python<'_>,
        markup: String,
        book_format: String,
        book_id: Option<i64>,
        authors: Option<Vec<(i64, String)>>,
        languages: Option<Vec<String>>,
    ) -> PyResult<bool> {
        let authors = authors.unwrap_or_default();
        let languages = languages.unwrap_or_default();
        Ok(py.detach(|| {
            self.builder
                .add(&markup, &book_format, book_id, &authors, &languages)
        }))
    }

    /// Add a batch of `(markup, book_format, book_id, authors, languages)` documents; returns, per document, whether
    /// it held words. Tokenizing runs on several threads without the GIL; counting stays serial and in order, so the
    /// result equals calling `add` for each document in turn.
    #[allow(clippy::type_complexity)]
    fn add_many(
        &mut self,
        py: Python<'_>,
        documents: Vec<(String, String, Option<i64>, Vec<(i64, String)>, Vec<String>)>,
    ) -> PyResult<Vec<bool>> {
        let batch: Vec<BatchDocument> = documents
            .into_iter()
            .map(
                |(markup, book_format, book_id, authors, languages)| BatchDocument {
                    markup,
                    book_format,
                    book_id,
                    authors,
                    languages,
                },
            )
            .collect();
        Ok(py.detach(|| self.builder.add_many(&batch)))
    }

    fn result(&self, py: Python<'_>) -> PyResult<Option<Py<PyDict>>> {
        self.builder.result(py)
    }

    /// Documents successfully added (books with cached text and at least one word).
    fn documents(&self) -> usize {
        self.builder.document_count()
    }

    /// Per-book profiles. The similarity pass (the slow half) runs without the GIL; the dicts need it.
    fn book_text(&self, py: Python<'_>) -> PyResult<Py<PyDict>> {
        let similar = py.detach(|| self.builder.similar_books());
        self.builder.book_text(py, similar)
    }

    fn author_text(&self, py: Python<'_>) -> PyResult<Py<PyDict>> {
        self.builder.author_text(py)
    }
}

/// The tuning constants, so Python re-exports them instead of keeping a second copy that can drift.
#[pyfunction]
fn settings(py: Python<'_>) -> PyResult<Py<PyDict>> {
    use crate::constants as c;
    let values = PyDict::new(py);
    values.set_item("CORPUS_WORDS", c::CORPUS_WORDS)?;
    values.set_item("CORPUS_NGRAMS", c::CORPUS_NGRAMS)?;
    values.set_item("CLOUD_WORDS", c::CLOUD_WORDS)?;
    values.set_item("CLOUD_MIN_LENGTH", c::CLOUD_MIN_LENGTH)?;
    values.set_item("BOOK_WORDS", c::BOOK_WORDS)?;
    values.set_item("BOOK_WORD_MIN_COUNT", c::BOOK_WORD_MIN_COUNT)?;
    values.set_item("BOOK_WORDS_MIN_SHOWN", c::BOOK_WORDS_MIN_SHOWN)?;
    values.set_item("BOOK_CANDIDATES", c::BOOK_CANDIDATES)?;
    values.set_item("BOOK_PHRASES", c::BOOK_PHRASES)?;
    values.set_item("BOOK_PHRASE_MIN_COUNT", c::BOOK_PHRASE_MIN_COUNT)?;
    values.set_item("BOOK_PHRASES_MIN_SHOWN", c::BOOK_PHRASES_MIN_SHOWN)?;
    values.set_item("AUTHOR_WORDS", c::AUTHOR_WORDS)?;
    values.set_item("AUTHOR_MIN_BOOKS", c::AUTHOR_MIN_BOOKS)?;
    values.set_item("AUTHOR_WORD_MIN_BOOKS", c::AUTHOR_WORD_MIN_BOOKS)?;
    values.set_item("AUTHOR_WORD_MIN_SHARE", c::AUTHOR_WORD_MIN_SHARE)?;
    values.set_item("AUTHOR_WORDS_MIN_SHOWN", c::AUTHOR_WORDS_MIN_SHOWN)?;
    values.set_item(
        "AUTHOR_PLACEHOLDERS",
        crate::corpus::AUTHOR_PLACEHOLDERS
            .iter()
            .copied()
            .collect::<Vec<_>>(),
    )?;
    values.set_item("SIMILAR_BOOKS", c::SIMILAR_BOOKS)?;
    values.set_item("SIMILAR_BOOKS_MIN_SHOWN", c::SIMILAR_BOOKS_MIN_SHOWN)?;
    values.set_item("SIMILAR_MIN_SCORE", c::SIMILAR_MIN_SCORE)?;
    values.set_item("SIMILAR_MAX_SCORE", c::SIMILAR_MAX_SCORE)?;
    values.set_item("SIMILAR_MAX_DOCUMENT_SHARE", c::SIMILAR_MAX_DOCUMENT_SHARE)?;
    values.set_item("MIN_NGRAM_COUNT", c::MIN_NGRAM_COUNT)?;
    values.set_item("MTLD_THRESHOLD", c::MTLD_THRESHOLD)?;
    values.set_item("MTLD_MIN_TOKENS", c::MTLD_MIN_TOKENS)?;
    values.set_item("MAX_NGRAM_ENTRIES", c::MAX_NGRAM_ENTRIES)?;
    values.set_item("LENGTH_BIN_EDGES", c::LENGTH_BIN_EDGES.to_vec())?;
    values.set_item("SENTIMENT_MIN_HITS", c::SENTIMENT_MIN_HITS)?;
    values.set_item("SENTIMENT_EMOTION_MIN_HITS", c::SENTIMENT_EMOTION_MIN_HITS)?;
    values.set_item("SENTIMENT_TREND_BUCKETS", c::SENTIMENT_TREND_BUCKETS)?;
    Ok(values.unbind())
}

/// Split reader HTML into whitespace-normalised text blocks (paragraphs, headings, list items, rows).
#[pyfunction]
fn html_to_blocks(markup: &str) -> Vec<String> {
    crate::text::html_to_blocks(markup)
}

#[pymodule]
fn taratsa_text(module: &Bound<'_, PyModule>) -> PyResult<()> {
    module.add_class::<PyCorpusBuilder>()?;
    module.add_function(wrap_pyfunction!(html_to_blocks, module)?)?;
    module.add_function(wrap_pyfunction!(settings, module)?)?;
    Ok(())
}
