//! Deleting books from the manager, in Rust. Flask's own path (`delete_book_from_table` → `helper.delete_book` →
//! `delete_whole_book`) did this per book with a commit and a fulltext thread each, and took 91 s for one selection
//! (measured 2026-11-28: the browser gave up at 18 s, and the previews behind it waited 15-33 s), so the manager's bulk
//! delete is answered here instead.
//!
//! What is removed, per book:
//! - the folder, when `books.path` is `<author>/<title>` and holds no sub folder (Flask walks and half-deletes a folder
//!   with sub folders; this refuses that book instead and says so), then an emptied author folder;
//! - the catalogue row (the `books_delete_trg` trigger removes links, data, comments, identifiers, positions, notes) and
//!   the `metadata_dirtied` row;
//! - the app.db state: shelves, read state, bookmarks, archive flag, Kobo sync/reading state (with its bookmarks and
//!   statistics), download counters, cover-thumbnail rows, the duplicate-index key. `scan_pending` is set so the next
//!   duplicate scan rebuilds; the thumbnail FILES stay for the nightly task, and the full-text chunks are deleted in
//!   Manticore when `MANTICORE_URL` is set (a failure is logged, never fatal).
//!
//! Every book gets an `audit_log` row, like `_bulk_delete`.

use crate::authors::open_library;
use crate::filename::strip_whitespaces;
use rusqlite::OptionalExtension;
use std::path::{Path, PathBuf};

/// One reported line of a delete run: (`success` | `error`, text).
pub type Line = (&'static str, String);

pub struct Deleted {
    pub lines: Vec<Line>,
    pub deleted: Vec<i64>,
}

fn remove_book_folder(library: &Path, path: &str) -> Result<Option<String>, String> {
    // `delete_book_file`: only `<author>/<title>`, never a shallower or deeper path.
    if path.matches('/').count() != 1 {
        return Ok(Some(format!(
            "Deleting book from database only, book path in database not valid: {path}"
        )));
    }
    let folder = library.join(path);
    if !folder.exists() {
        return Ok(Some(format!(
            "Deleting book from database only, book path in database not valid: {path}"
        )));
    }
    let has_subfolders = std::fs::read_dir(&folder)
        .map(|entries| entries.flatten().any(|entry| entry.path().is_dir()))
        .unwrap_or(false);
    if has_subfolders {
        return Err(format!("path has subfolders: {path}"));
    }
    if let Err(error) = std::fs::remove_dir_all(&folder) {
        return Err(format!("Deleting book folder failed: {error}"));
    }
    // The author folder disappears when this was its last book.
    if let Some(author) = folder.parent()
        && author != library
        && std::fs::read_dir(author).is_ok_and(|mut entries| entries.next().is_none())
    {
        let _ = std::fs::remove_dir(author);
    }
    Ok(None)
}

/// The app.db rows that point at a book, in one transaction.
fn forget_in_app_db(app_db: &Path, id: i64) -> rusqlite::Result<()> {
    let mut conn = rusqlite::Connection::open(app_db)?;
    conn.busy_timeout(std::time::Duration::from_secs(30))?;
    let tx = conn.transaction()?;
    for (table, column) in [
        ("book_shelf_link", "book_id"),
        ("book_read_link", "book_id"),
        ("bookmark", "book_id"),
        ("archived_book", "book_id"),
        ("kobo_synced_books", "book_id"),
        ("downloads", "book_id"),
        ("duplicate_book_key", "book_id"),
    ] {
        // A table that does not exist in an older app.db is skipped rather than failing the delete.
        let _ = tx.execute(&format!("DELETE FROM {table} WHERE {column} = ?1"), [id]);
    }
    let _ = tx.execute(
        "DELETE FROM kobo_bookmark WHERE kobo_reading_state_id IN (SELECT id FROM kobo_reading_state WHERE book_id = ?1)",
        [id],
    );
    let _ = tx.execute(
        "DELETE FROM kobo_statistics WHERE kobo_reading_state_id IN (SELECT id FROM kobo_reading_state WHERE book_id = ?1)",
        [id],
    );
    let _ = tx.execute("DELETE FROM kobo_reading_state WHERE book_id = ?1", [id]);
    let _ = tx.execute(
        "DELETE FROM thumbnail WHERE entity_id = ?1 AND type = 1",
        [id],
    );
    let _ = tx.execute(
        "INSERT INTO duplicate_index_cache (id, scan_pending) VALUES (1, 1)
         ON CONFLICT(id) DO UPDATE SET scan_pending = 1",
        [],
    );
    tx.commit()
}

/// `fulltext_store.delete_book`: drop the book's chunks so `/search/text/` cannot link to a deleted book. The caller
/// runs inside a blocking task with a tokio runtime handle, so the async client is fine here.
fn forget_in_manticore(url: Option<&str>, id: i64) {
    let Some(url) = url else {
        return;
    };
    let endpoint = format!("{}/sql?mode=raw", url.trim_end_matches('/'));
    let body = format!("DELETE FROM text_chunks WHERE book = {id}");
    let send = async move {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(10))
            .build()?;
        client.post(endpoint).body(body).send().await?;
        Ok::<(), reqwest::Error>(())
    };
    match tokio::runtime::Handle::try_current() {
        Ok(handle) => {
            if let Err(error) = handle.block_on(send) {
                tracing::warn!("[fulltext] could not remove book {id} from the index: {error}");
            }
        }
        Err(_) => tracing::warn!("[fulltext] no runtime to remove book {id} from the index"),
    }
}

/// Delete `ids` (already checked against the account's visibility) and report one line per outcome.
pub fn delete_books(
    library: &Path,
    metadata_db: &Path,
    app_db: &Path,
    manticore: Option<&str>,
    ids: &[i64],
) -> Result<Deleted, String> {
    let mut conn = open_library(metadata_db, None).map_err(|error| error.to_string())?;
    let mut lines: Vec<Line> = Vec::new();
    let mut deleted = Vec::new();
    for id in ids {
        let path: Option<String> = conn
            .query_row("SELECT path FROM books WHERE id = ?1", [id], |row| {
                row.get(0)
            })
            .optional()
            .map_err(|error| error.to_string())?;
        let Some(path) = path else {
            lines.push(("error", format!("Book #{id} no longer exists")));
            continue;
        };
        match remove_book_folder(library, &path) {
            Ok(warning) => {
                if let Some(warning) = warning {
                    lines.push(("error", format!("#{id}: {warning}")));
                }
            }
            Err(message) => {
                lines.push(("error", format!("#{id}: {message}")));
                continue;
            }
        }
        let tx = conn.transaction().map_err(|error| error.to_string())?;
        tx.execute("DELETE FROM books WHERE id = ?1", [id])
            .map_err(|error| format!("#{id}: {error}"))?;
        let _ = tx.execute("DELETE FROM metadata_dirtied WHERE book = ?1", [id]);
        tx.commit().map_err(|error| error.to_string())?;
        if let Err(error) = forget_in_app_db(app_db, *id) {
            tracing::warn!("book {id}: app.db cleanup failed: {error}");
        }
        forget_in_manticore(manticore, *id);
        deleted.push(*id);
    }
    Ok(Deleted { lines, deleted })
}

/// One `audit_log` row per deleted book (`_bulk_delete` writes the same).
pub fn audit(app_db: &Path, user_id: i64, ip: &str, ids: &[i64]) {
    for id in ids {
        crate::authdb::audit_resource(
            app_db,
            user_id,
            "delete",
            "book",
            Some(&id.to_string()),
            "Book deleted via the book manager",
            ip,
        );
    }
}

/// `get_valid_filename`-free helper kept for callers that only have a stored `|` name.
pub fn display_title(name: &str) -> String {
    strip_whitespaces(name).replace('|', ",")
}

/// The folder of a stored path, for tests and callers that report where a book lived.
pub fn folder_of(library: &Path, path: &str) -> PathBuf {
    library.join(path)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_valid_two_level_path_is_removed_with_its_emptied_author_folder() {
        let dir = tempfile::TempDir::new().unwrap();
        let folder = dir.path().join("Author/Title (1)");
        std::fs::create_dir_all(&folder).unwrap();
        std::fs::write(folder.join("Title - Author.pdf"), b"x").unwrap();
        assert_eq!(remove_book_folder(dir.path(), "Author/Title (1)"), Ok(None));
        assert!(
            !dir.path().join("Author").exists(),
            "the author folder goes with the last book"
        );
    }

    #[test]
    fn a_folder_with_subfolders_is_refused_and_left_alone() {
        let dir = tempfile::TempDir::new().unwrap();
        let folder = dir.path().join("Author/Title (1)");
        std::fs::create_dir_all(folder.join("extra")).unwrap();
        let error = remove_book_folder(dir.path(), "Author/Title (1)").unwrap_err();
        assert!(error.contains("subfolders"), "{error}");
        assert!(folder.join("extra").is_dir(), "nothing was removed");
    }

    #[test]
    fn a_path_that_is_not_two_levels_only_warns() {
        let dir = tempfile::TempDir::new().unwrap();
        let warning = remove_book_folder(dir.path(), "JustOneLevel").unwrap();
        assert!(warning.is_some());
        let warning = remove_book_folder(dir.path(), "a/b/c").unwrap();
        assert!(warning.is_some());
    }
}
