//! Read-only queries on Calibre's `metadata.db`. This service never writes to the library.

use crate::settings::open_read_only;
use rusqlite::OptionalExtension;
use std::path::Path;

#[derive(Debug, Clone)]
pub struct Format {
    pub book_path: String,
    pub title: Option<String>,
    pub last_modified: Option<String>,
    pub first_author: Option<String>,
    /// File stem inside the book folder (`data.name`).
    pub name: String,
    pub size: Option<i64>,
}

/// One format of one book, or `None` when the book or the format does not exist.
///
/// `book_format` is matched upper-case, like `get_book_format(book.id, book_format.upper())`. The first author
/// is the lowest author id, which is the order SQLAlchemy's lazy load returns (checked against all 1,228
/// multi-author books in the live library).
pub fn find_format(
    metadata_db: &Path,
    book_id: i64,
    book_format: &str,
) -> rusqlite::Result<Option<Format>> {
    let conn = open_read_only(metadata_db)?;
    conn.query_row(
        "SELECT b.path, b.title, b.last_modified, d.name, d.uncompressed_size,
                (SELECT a.name FROM books_authors_link l JOIN authors a ON a.id = l.author
                 WHERE l.book = b.id ORDER BY l.author LIMIT 1)
         FROM books b JOIN data d ON d.book = b.id
         WHERE b.id = ?1 AND d.format = ?2 LIMIT 1",
        rusqlite::params![book_id, book_format.to_uppercase()],
        |row| {
            Ok(Format {
                book_path: row.get(0)?,
                title: row.get(1)?,
                last_modified: row.get(2)?,
                name: row.get(3)?,
                size: row.get(4)?,
                first_author: row.get(5)?,
            })
        },
    )
    .optional()
}

pub fn ping(path: &Path) -> Result<(), String> {
    let conn = open_read_only(path).map_err(|e| e.to_string())?;
    conn.query_row("SELECT 1", [], |_| Ok(()))
        .map_err(|e| e.to_string())
}

/// The SQL tail and parameters of Flask's `common_filters(allow_show_archived=True)` for the anonymous user:
/// guest language, denied tags and allowed tags. Appended after a `WHERE b.id = ?1 ...` condition on `books b`;
/// the parameters use anonymous `?`, so they number after the caller's explicit ones.
/// Archived books are not filtered (the callers pass `allow_show_archived=True`, or the guest has none).
pub fn visibility_clause(
    language: &str,
    denied: &str,
    allowed: &str,
) -> (String, Vec<rusqlite::types::Value>) {
    let denied = split_filter(denied);
    let allowed = split_filter(allowed);
    let mut sql = String::new();
    let mut values = Vec::new();
    if !language.is_empty() && language != "all" {
        sql.push_str(" AND EXISTS (SELECT 1 FROM books_languages_link bl JOIN languages l ON l.id = bl.lang_code WHERE bl.book = b.id AND l.lang_code = ?)");
        values.push(language.to_owned().into());
    }
    if !denied.is_empty() {
        sql.push_str(" AND NOT EXISTS (SELECT 1 FROM books_tags_link bt JOIN tags t ON t.id = bt.tag WHERE bt.book = b.id AND t.name IN (");
        placeholders(&mut sql, denied.len());
        sql.push_str("))");
        values.extend(denied.into_iter().map(Into::into));
    }
    if !allowed.is_empty() {
        sql.push_str(" AND EXISTS (SELECT 1 FROM books_tags_link bt JOIN tags t ON t.id = bt.tag WHERE bt.book = b.id AND t.name IN (");
        placeholders(&mut sql, allowed.len());
        sql.push_str("))");
        values.extend(allowed.into_iter().map(Into::into));
    }
    (sql, values)
}

/// Like [`find_format`], but only when the anonymous user may see the book.
pub fn find_visible_format(
    metadata_db: &Path,
    book_id: i64,
    book_format: &str,
    language: &str,
    denied: &str,
    allowed: &str,
) -> rusqlite::Result<Option<Format>> {
    let conn = open_read_only(metadata_db)?;
    let (filter, extra) = visibility_clause(language, denied, allowed);
    let sql = format!(
        "SELECT b.path, b.title, b.last_modified, d.name, d.uncompressed_size,
                (SELECT a.name FROM books_authors_link l JOIN authors a ON a.id = l.author
                 WHERE l.book = b.id ORDER BY l.author LIMIT 1)
         FROM books b JOIN data d ON d.book = b.id
         WHERE b.id = ?1 AND d.format = ?2{filter} LIMIT 1"
    );
    let mut values: Vec<rusqlite::types::Value> =
        vec![book_id.into(), book_format.to_uppercase().into()];
    values.extend(extra);
    conn.query_row(&sql, rusqlite::params_from_iter(values), |row| {
        Ok(Format {
            book_path: row.get(0)?,
            title: row.get(1)?,
            last_modified: row.get(2)?,
            name: row.get(3)?,
            size: row.get(4)?,
            first_author: row.get(5)?,
        })
    })
    .optional()
}
/// Data used by the PDF reader shell. Keep the book row even when it has no PDF: Flask still renders the reader and
/// points it at `/show/<id>/pdf`, which then answers the ordinary missing-file response.
#[derive(Debug, Clone)]
pub struct PdfReaderBook {
    pub title: String,
    pub last_modified: Option<String>,
    pub pdf_size: Option<i64>,
}

/// An anonymous `read_book` lookup after Flask's `get_filtered_book`: guest language/tag filters, with a LEFT JOIN
/// because `get_pdf_reader_url()` falls back to `/show` when no PDF format row exists.
pub fn find_visible_pdf_reader_book(
    metadata_db: &Path,
    book_id: i64,
    language: &str,
    denied: &str,
    allowed: &str,
) -> rusqlite::Result<Option<PdfReaderBook>> {
    let conn = open_read_only(metadata_db)?;
    let (filter, extra) = visibility_clause(language, denied, allowed);
    let sql = format!(
        "SELECT b.title, b.last_modified, d.uncompressed_size
         FROM books b LEFT JOIN data d ON d.book = b.id AND d.format = 'PDF'
         WHERE b.id = ?1{filter} LIMIT 1"
    );
    let mut values: Vec<rusqlite::types::Value> = vec![book_id.into()];
    values.extend(extra);
    conn.query_row(&sql, rusqlite::params_from_iter(values), |row| {
        Ok(PdfReaderBook {
            title: row.get::<_, Option<String>>(0)?.unwrap_or_default(),
            last_modified: row.get(1)?,
            pdf_size: row.get(2)?,
        })
    })
    .optional()
}

fn split_filter(value: &str) -> Vec<String> {
    value
        .split(',')
        .map(|part| {
            part.trim_matches(|c: char| {
                c.is_whitespace() || matches!(c, '\u{200B}'..='\u{200D}' | '\u{FEFF}')
            })
        })
        .filter(|part| !part.is_empty())
        .map(str::to_owned)
        .collect()
}

fn placeholders(sql: &mut String, count: usize) {
    for i in 0..count {
        if i > 0 {
            sql.push(',');
        }
        sql.push('?');
    }
}

#[cfg(test)]
mod tests {
    #[test]
    fn tag_filter_splits_and_trims_unicode_whitespace() {
        assert_eq!(
            super::split_filter(" foo, bar ,\u{200B}baz\u{FEFF}"),
            vec!["foo", "bar", "baz"]
        );
    }

    #[test]
    fn clause_is_empty_for_an_unfiltered_guest() {
        let (sql, values) = super::visibility_clause("all", "", "");
        assert!(sql.is_empty() && values.is_empty());
        let (sql, values) = super::visibility_clause("ind", "x, y", "");
        assert_eq!(values.len(), 3);
        assert_eq!(sql.matches('?').count(), 3);
    }
}
