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
