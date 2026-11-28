//! Bulk author rename and merge in Calibre's `metadata.db`: "change author `abc` to `xyz`" across every book at once.
//!
//! The change is DATABASE ONLY. `books.path` is authoritative in Calibre, so a book keeps working in its old folder
//! after its author is renamed (Calibre desktop moves the folder the next time it saves that book's metadata). The
//! Flask editor moves folders; this does not, because `library/` is never touched by this backend, and because in
//! the real library 1,006 of 24,465 folders already do not match their first author.
//!
//! Semantics follow `prepare_authors` / `create_objects_for_addition` in `cps/editbooks.py`:
//! - names are stored with `,` written as `|`; one author at a time (`&` separates authors, so it is refused);
//! - a rename sets `authors.sort` to `get_sorted_author(name)` and replaces the old sort string inside every
//!   `books.author_sort` where a WHOLE ` & `-separated component equals it (Flask's `str.replace` also rewrites longer
//!   names that merely contain it), rebuilding it from the link order when no component matches or the book already
//!   had the target author;
//! - renaming onto an EXISTING author merges: books move to it, a book that has both keeps one link;
//! - every touched book gets `last_modified` (so signed `/files` URLs and exported metadata refresh) and a
//!   `metadata_dirtied` row (so Calibre desktop rewrites the OPF).

use rusqlite::functions::FunctionFlags;
use rusqlite::{Connection, OptionalExtension, params};
use std::path::Path;
use std::time::Duration;

/// `helper.get_sorted_author`, byte for byte (vectors in the tests come from Flask's own function).
pub fn sorted_author(value: &str) -> String {
    if value.contains(',') {
        return value.to_owned();
    }
    let parts: Vec<&str> = value.split(' ').collect();
    let last = parts[parts.len() - 1];
    if is_suffix(last) {
        if parts.len() > 1 {
            let head = parts[..parts.len() - 2].join(" ");
            format!("{}, {} {}", parts[parts.len() - 2], head, last)
        } else {
            parts[0].to_owned()
        }
    } else if parts.len() == 1 {
        parts[0].to_owned()
    } else {
        format!("{}, {}", last, parts[..parts.len() - 1].join(" "))
    }
}

/// `^(JR|SR)\.?$`, `^I{1,3}\.?$`, `^IV\.?$` on the upper-cased word.
fn is_suffix(word: &str) -> bool {
    let upper = word.to_uppercase();
    let core = upper.strip_suffix('.').unwrap_or(&upper);
    matches!(core, "JR" | "SR" | "I" | "II" | "III" | "IV")
}

#[derive(Debug, PartialEq, Eq)]
pub enum NameError {
    Empty,
    Several,
}

/// What is stored: trimmed, `,` as `|`. `&` would be two authors.
pub fn normalize(input: &str) -> Result<String, NameError> {
    let name = input.trim().replace(',', "|");
    if name.is_empty() {
        return Err(NameError::Empty);
    }
    if name.contains('&') {
        return Err(NameError::Several);
    }
    Ok(name)
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Mode {
    /// The new name is free: the author row is renamed.
    Rename,
    /// Only the capitalisation changes (`authors.name` is unique NOCASE, so the row is the same).
    CaseOnly,
    /// The new name is another existing author: books move to it and this author is deleted.
    Merge,
}

#[derive(Debug)]
pub struct Plan {
    pub mode: Mode,
    pub old_id: i64,
    pub old_name: String,
    pub old_sort: String,
    pub new_name: String,
    /// The existing target's id and sort (merge only).
    pub target: Option<(i64, String)>,
    /// `(book id, title, link id, author_sort, already has the target)` in book id order.
    pub books: Vec<PlannedBook>,
}

#[derive(Debug, Clone)]
pub struct PlannedBook {
    pub id: i64,
    pub title: String,
    pub link_id: i64,
    pub author_sort: String,
    pub had_target: bool,
}

#[derive(Debug, PartialEq, Eq)]
pub enum PlanError {
    Name(NameError),
    NotFound,
    Unchanged,
    Db(String),
}

impl From<rusqlite::Error> for PlanError {
    fn from(error: rusqlite::Error) -> Self {
        PlanError::Db(error.to_string())
    }
}

/// `title_sort` and `uuid4` are Python functions Calibre registers on its connections; the triggers of `metadata.db`
/// name them, so any UPDATE of `books` fails without them ("no such function: title_sort").
pub fn open_library(path: &Path) -> rusqlite::Result<Connection> {
    let conn = Connection::open_with_flags(
        path,
        rusqlite::OpenFlags::SQLITE_OPEN_READ_WRITE | rusqlite::OpenFlags::SQLITE_OPEN_NO_MUTEX,
    )?;
    conn.busy_timeout(Duration::from_secs(30))?;
    register_functions(&conn)?;
    Ok(conn)
}

pub fn register_functions(conn: &Connection) -> rusqlite::Result<()> {
    conn.create_scalar_function(
        "title_sort",
        1,
        FunctionFlags::SQLITE_UTF8 | FunctionFlags::SQLITE_DETERMINISTIC,
        |ctx| ctx.get::<Option<String>>(0),
    )?;
    conn.create_scalar_function("uuid4", 0, FunctionFlags::SQLITE_UTF8, |_| {
        Ok(uuid::Uuid::new_v4().to_string())
    })?;
    Ok(())
}

/// Work out what renaming author `old` to `new` would do, without writing anything.
pub fn plan(conn: &Connection, old: &str, new: &str) -> Result<Plan, PlanError> {
    let old = normalize(old).map_err(PlanError::Name)?;
    let new = normalize(new).map_err(PlanError::Name)?;
    let found: Option<(i64, String, Option<String>)> = conn
        .query_row(
            "SELECT id, name, sort FROM authors WHERE name = ?1 COLLATE NOCASE",
            [&old],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .optional()?;
    let Some((old_id, old_name, old_sort)) = found else {
        return Err(PlanError::NotFound);
    };
    if old_name == new {
        return Err(PlanError::Unchanged);
    }
    let target: Option<(i64, String, Option<String>)> = conn
        .query_row(
            "SELECT id, name, sort FROM authors WHERE name = ?1 COLLATE NOCASE",
            [&new],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .optional()?;
    let (mode, target) = match target {
        Some((id, _, _)) if id == old_id => (Mode::CaseOnly, None),
        Some((id, _, sort)) => (Mode::Merge, Some((id, sort.unwrap_or_default()))),
        None => (Mode::Rename, None),
    };
    let target_id = target.as_ref().map(|(id, _)| *id);
    let mut statement = conn.prepare(
        "SELECT b.id, b.title, l.id, b.author_sort,
                EXISTS (SELECT 1 FROM books_authors_link t WHERE t.book = b.id AND t.author = ?2)
         FROM books_authors_link l JOIN books b ON b.id = l.book
         WHERE l.author = ?1 ORDER BY b.id",
    )?;
    let books = statement
        .query_map(params![old_id, target_id.unwrap_or(-1)], |row| {
            Ok(PlannedBook {
                id: row.get(0)?,
                title: row.get::<_, Option<String>>(1)?.unwrap_or_default(),
                link_id: row.get(2)?,
                author_sort: row.get::<_, Option<String>>(3)?.unwrap_or_default(),
                had_target: row.get::<_, i64>(4)? != 0,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(Plan {
        mode,
        old_id,
        old_name,
        old_sort: old_sort.unwrap_or_default(),
        new_name: new,
        target,
        books,
    })
}

/// The new `books.author_sort`: the stored string is `sort1 & sort2 & ...`, so the old sort is replaced only where a
/// WHOLE component equals it. Flask uses `str.replace`, which also rewrites a longer name that merely contains the old
/// sort ("Anonim" inside "(Anonim), Pembantu Varia"); in the real library 12,496 stored strings contain another
/// author's sort as a substring. When no component matches, the string is rebuilt from the link order.
pub fn new_author_sort(
    stored: &str,
    old_sort: &str,
    new_sort: &str,
    rebuilt: impl FnOnce() -> String,
) -> String {
    let parts: Vec<&str> = stored.split(" & ").collect();
    if !old_sort.is_empty() && parts.contains(&old_sort) {
        parts
            .iter()
            .map(|part| if *part == old_sort { new_sort } else { part })
            .collect::<Vec<_>>()
            .join(" & ")
    } else {
        rebuilt()
    }
}

#[derive(Debug)]
pub struct Applied {
    pub mode: Mode,
    pub books: usize,
    pub new_name: String,
    pub backup: Option<std::path::PathBuf>,
}

/// A consistent copy of the database next to the library's backups (`VACUUM INTO`), taken before any write.
pub fn backup(conn: &Connection, directory: &Path) -> Result<std::path::PathBuf, String> {
    std::fs::create_dir_all(directory)
        .map_err(|e| format!("cannot create {}: {e}", directory.display()))?;
    let stamp = chrono::Utc::now().format("%Y%m%dT%H%M%SZ");
    let target = directory.join(format!("metadata-{stamp}.db"));
    conn.execute("VACUUM INTO ?1", [target.to_string_lossy().as_ref()])
        .map_err(|e| format!("backup failed: {e}"))?;
    Ok(target)
}

/// Apply a plan in ONE transaction. Re-plans first, so a change made after the preview is noticed (the numbers the
/// admin confirmed must still be true).
pub fn apply(
    conn: &mut Connection,
    old: &str,
    new: &str,
    expected_books: usize,
    backup_dir: Option<&Path>,
) -> Result<Applied, String> {
    let plan = plan(conn, old, new).map_err(|error| format!("{error:?}"))?;
    if plan.books.len() != expected_books {
        return Err(format!(
            "the library changed since the preview: {} books now, {} confirmed",
            plan.books.len(),
            expected_books
        ));
    }
    let backup = match backup_dir {
        Some(dir) => Some(backup(conn, dir)?),
        None => None,
    };
    let new_sort = sorted_author(&plan.new_name.replace('|', ","));
    let now = chrono::Utc::now()
        .format("%Y-%m-%d %H:%M:%S%.6f+00:00")
        .to_string();
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let fail = |e: rusqlite::Error| e.to_string();
    match plan.mode {
        Mode::Rename | Mode::CaseOnly => {
            tx.execute(
                "UPDATE authors SET name = ?2, sort = ?3 WHERE id = ?1",
                params![plan.old_id, plan.new_name, new_sort],
            )
            .map_err(fail)?;
        }
        Mode::Merge => {}
    }
    let (final_id, final_sort) = match &plan.target {
        Some((id, sort)) => (*id, sort.clone()),
        None => (plan.old_id, new_sort.clone()),
    };
    for book in &plan.books {
        if plan.mode == Mode::Merge {
            if book.had_target {
                tx.execute(
                    "DELETE FROM books_authors_link WHERE id = ?1",
                    [book.link_id],
                )
                .map_err(fail)?;
            } else {
                tx.execute(
                    "UPDATE books_authors_link SET author = ?2 WHERE id = ?1",
                    params![book.link_id, final_id],
                )
                .map_err(fail)?;
            }
        }
        let rebuilt = || -> String {
            let mut statement = tx
                .prepare(
                    "SELECT a.sort FROM books_authors_link l JOIN authors a ON a.id = l.author
                     WHERE l.book = ?1 ORDER BY l.id",
                )
                .expect("static SQL");
            let sorts: Vec<String> = statement
                .query_map([book.id], |row| row.get::<_, Option<String>>(0))
                .expect("query")
                .filter_map(Result::ok)
                .map(Option::unwrap_or_default)
                .collect();
            sorts.join(" & ")
        };
        let sort = if book.had_target && plan.mode == Mode::Merge {
            rebuilt()
        } else {
            new_author_sort(&book.author_sort, &plan.old_sort, &final_sort, rebuilt)
        };
        tx.execute(
            "UPDATE books SET author_sort = ?2, last_modified = ?3 WHERE id = ?1",
            params![book.id, sort, now],
        )
        .map_err(fail)?;
        tx.execute(
            "INSERT OR IGNORE INTO metadata_dirtied (book) VALUES (?1)",
            [book.id],
        )
        .map_err(fail)?;
    }
    if plan.mode == Mode::Merge {
        let left: i64 = tx
            .query_row(
                "SELECT count(*) FROM books_authors_link WHERE author = ?1",
                [plan.old_id],
                |row| row.get(0),
            )
            .map_err(fail)?;
        if left == 0 {
            tx.execute("DELETE FROM authors WHERE id = ?1", [plan.old_id])
                .map_err(fail)?;
        }
    }
    tx.commit().map_err(|e| e.to_string())?;
    Ok(Applied {
        mode: plan.mode,
        books: plan.books.len(),
        new_name: if plan.mode == Mode::Merge {
            plan.target
                .map(|_| plan.new_name.clone())
                .unwrap_or_default()
        } else {
            plan.new_name
        },
        backup,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Values produced by `cps.helper.get_sorted_author` in the app image.
    #[test]
    fn sorted_author_matches_flask() {
        for (name, expected) in [
            ("Pramoedya Ananta Toer", "Toer, Pramoedya Ananta"),
            ("abc", "abc"),
            ("John Smith Jr.", "Smith, John Jr."),
            ("John Jr.", "John,  Jr."),
            ("Jr.", "Jr."),
            ("Martin Luther King III", "King, Martin Luther III"),
            ("Anne Hathaway II", "Hathaway, Anne II"),
            ("Komnas HAM", "HAM, Komnas"),
            ("Doe, John", "Doe, John"),
            ("A  B", "B, A "),
            ("Smith SR", "Smith,  SR"),
            ("X IV", "X,  IV"),
            ("", ""),
            ("Onno Widodo Purbo", "Purbo, Onno Widodo"),
            ("Tan Malaka", "Malaka, Tan"),
            ("Sutan  Sjahrir", "Sjahrir, Sutan "),
        ] {
            assert_eq!(sorted_author(name), expected, "{name:?}");
        }
    }

    #[test]
    fn names_are_normalised_like_prepare_authors() {
        assert_eq!(normalize("  Doe, John "), Ok("Doe| John".to_owned()));
        assert_eq!(normalize("   "), Err(NameError::Empty));
        assert_eq!(normalize("A & B"), Err(NameError::Several));
    }

    fn library() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        register_functions(&conn).unwrap();
        conn.execute_batch(
            "CREATE TABLE books (id INTEGER PRIMARY KEY, title TEXT, sort TEXT, author_sort TEXT,
                last_modified TIMESTAMP, path TEXT, uuid TEXT);
             CREATE TABLE authors (id INTEGER PRIMARY KEY, name TEXT NOT NULL COLLATE NOCASE UNIQUE,
                sort TEXT COLLATE NOCASE, link TEXT NOT NULL DEFAULT '');
             CREATE TABLE books_authors_link (id INTEGER PRIMARY KEY, book INTEGER NOT NULL, author INTEGER NOT NULL,
                UNIQUE(book, author));
             CREATE TABLE metadata_dirtied (id INTEGER PRIMARY KEY, book INTEGER NOT NULL UNIQUE);
             CREATE TRIGGER books_update_trg AFTER UPDATE ON books BEGIN
                UPDATE books SET sort=title_sort(NEW.title) WHERE id=NEW.id AND OLD.title <> NEW.title; END;
             CREATE TRIGGER fkc_delete_on_authors BEFORE DELETE ON authors BEGIN
                SELECT CASE WHEN (SELECT COUNT(id) FROM books_authors_link WHERE author=OLD.id) > 0
                THEN RAISE(ABORT, 'Foreign key violation: authors is still referenced') END; END;
             INSERT INTO authors VALUES (1, 'abc', 'abc', ''), (2, 'Tan Malaka', 'Malaka, Tan', ''),
                (3, 'xyz', 'xyz', ''), (4, 'Other Person', 'Person, Other', '');
             INSERT INTO books (id, title, author_sort, last_modified, path) VALUES
                (10, 'Solo', 'abc', '2020-01-01 00:00:00', 'abc/Solo (10)'),
                (11, 'Shared', 'Malaka, Tan & abc', '2020-01-01 00:00:00', 'Tan Malaka/Shared (11)'),
                (12, 'Both', 'abc & xyz', '2020-01-01 00:00:00', 'abc/Both (12)'),
                (13, 'Unrelated', 'Person, Other', '2020-01-01 00:00:00', 'Other Person/Unrelated (13)');
             INSERT INTO books_authors_link (book, author) VALUES (10,1),(11,2),(11,1),(12,1),(12,3),(13,4);",
        )
        .unwrap();
        conn
    }

    fn sort_of(conn: &Connection, id: i64) -> String {
        conn.query_row("SELECT author_sort FROM books WHERE id = ?1", [id], |row| {
            row.get(0)
        })
        .unwrap()
    }

    #[test]
    fn a_free_name_renames_the_author_in_place() {
        let mut conn = library();
        let preview = plan(&conn, "abc", "Xavier Yu").unwrap();
        assert_eq!(preview.mode, Mode::Rename);
        assert_eq!(
            preview.books.iter().map(|b| b.id).collect::<Vec<_>>(),
            vec![10, 11, 12]
        );
        let done = apply(&mut conn, "abc", "Xavier Yu", 3, None).unwrap();
        assert_eq!((done.mode, done.books), (Mode::Rename, 3));
        let (name, sort): (String, String) = conn
            .query_row("SELECT name, sort FROM authors WHERE id = 1", [], |r| {
                Ok((r.get(0)?, r.get(1)?))
            })
            .unwrap();
        assert_eq!((name.as_str(), sort.as_str()), ("Xavier Yu", "Yu, Xavier"));
        // the old sort string is replaced inside each stored author_sort, other authors untouched
        assert_eq!(sort_of(&conn, 10), "Yu, Xavier");
        assert_eq!(sort_of(&conn, 11), "Malaka, Tan & Yu, Xavier");
        assert_eq!(sort_of(&conn, 12), "Yu, Xavier & xyz");
        assert_eq!(sort_of(&conn, 13), "Person, Other");
        // touched books are marked for Calibre; the unrelated one is not
        let dirty: i64 = conn
            .query_row("SELECT count(*) FROM metadata_dirtied", [], |r| r.get(0))
            .unwrap();
        assert_eq!(dirty, 3);
        let modified: String = conn
            .query_row("SELECT last_modified FROM books WHERE id = 10", [], |r| {
                r.get(0)
            })
            .unwrap();
        assert!(
            modified.starts_with(&chrono::Utc::now().format("%Y-%m-%d").to_string()),
            "{modified}"
        );
        let untouched: String = conn
            .query_row("SELECT last_modified FROM books WHERE id = 13", [], |r| {
                r.get(0)
            })
            .unwrap();
        assert_eq!(untouched, "2020-01-01 00:00:00");
        // folders are NOT renamed: the path column is authoritative and library/ is never touched
        let path: String = conn
            .query_row("SELECT path FROM books WHERE id = 10", [], |r| r.get(0))
            .unwrap();
        assert_eq!(path, "abc/Solo (10)");
    }

    #[test]
    fn renaming_onto_an_existing_author_merges_and_keeps_one_link_per_book() {
        let mut conn = library();
        let preview = plan(&conn, "abc", "XYZ").unwrap();
        assert_eq!(
            preview.mode,
            Mode::Merge,
            "NOCASE: 'XYZ' is the existing 'xyz'"
        );
        assert_eq!(preview.books.iter().filter(|b| b.had_target).count(), 1);
        apply(&mut conn, "abc", "XYZ", 3, None).unwrap();
        let gone: i64 = conn
            .query_row("SELECT count(*) FROM authors WHERE id = 1", [], |r| {
                r.get(0)
            })
            .unwrap();
        assert_eq!(gone, 0, "the emptied author is deleted");
        let links: Vec<(i64, i64)> = conn
            .prepare("SELECT book, author FROM books_authors_link ORDER BY book, id")
            .unwrap()
            .query_map([], |r| Ok((r.get(0)?, r.get(1)?)))
            .unwrap()
            .map(Result::unwrap)
            .collect();
        assert_eq!(links, vec![(10, 3), (11, 2), (11, 3), (12, 3), (13, 4)]);
        assert_eq!(sort_of(&conn, 10), "xyz");
        assert_eq!(sort_of(&conn, 11), "Malaka, Tan & xyz");
        assert_eq!(
            sort_of(&conn, 12),
            "xyz",
            "a book that had both is rebuilt from its links"
        );
    }

    /// Flask's `str.replace` would turn "Anonim, Pembantu" into the new name too; a whole-component match must not.
    #[test]
    fn only_a_whole_component_of_author_sort_is_replaced() {
        let rebuilt = || "REBUILT".to_owned();
        assert_eq!(
            new_author_sort(
                "(Anonim), Pembantu Varia & Anonim",
                "Anonim",
                "Penulis, Baru",
                rebuilt
            ),
            "(Anonim), Pembantu Varia & Penulis, Baru"
        );
        assert_eq!(
            new_author_sort("Anonim & Lain, Orang & Anonim", "Anonim", "X", rebuilt),
            "X & Lain, Orang & X",
            "every whole component, as the link table could hold it twice in a damaged row"
        );
        // no whole component: the string is rebuilt from the links instead of guessing
        assert_eq!(
            new_author_sort("(Anonim), Pembantu Varia", "Anonim", "X", rebuilt),
            "REBUILT"
        );
        assert_eq!(new_author_sort("", "Anonim", "X", rebuilt), "REBUILT");
        assert_eq!(new_author_sort("abc", "", "X", rebuilt), "REBUILT");
    }

    #[test]
    fn a_case_only_change_keeps_the_same_author() {
        let mut conn = library();
        assert_eq!(plan(&conn, "abc", "ABC").unwrap().mode, Mode::CaseOnly);
        apply(&mut conn, "abc", "ABC", 3, None).unwrap();
        let name: String = conn
            .query_row("SELECT name FROM authors WHERE id = 1", [], |r| r.get(0))
            .unwrap();
        assert_eq!(name, "ABC");
    }

    #[test]
    fn refuses_what_it_cannot_do_safely() {
        let mut conn = library();
        assert_eq!(plan(&conn, "nobody", "x").unwrap_err(), PlanError::NotFound);
        assert_eq!(plan(&conn, "abc", "abc").unwrap_err(), PlanError::Unchanged);
        assert_eq!(
            plan(&conn, "abc", "A & B").unwrap_err(),
            PlanError::Name(NameError::Several)
        );
        assert_eq!(
            plan(&conn, "abc", "  ").unwrap_err(),
            PlanError::Name(NameError::Empty)
        );
        // a preview that no longer matches (a book was added meanwhile) is refused, nothing is written
        conn.execute(
            "INSERT INTO books (id, title, author_sort) VALUES (20, 'New', 'abc')",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO books_authors_link (book, author) VALUES (20, 1)",
            [],
        )
        .unwrap();
        let error = apply(&mut conn, "abc", "Xavier Yu", 3, None).unwrap_err();
        assert!(error.contains("changed since the preview"), "{error}");
        let name: String = conn
            .query_row("SELECT name FROM authors WHERE id = 1", [], |r| r.get(0))
            .unwrap();
        assert_eq!(name, "abc");
    }

    #[test]
    fn a_failure_in_the_middle_rolls_everything_back() {
        let mut conn = library();
        conn.execute_batch(
            "CREATE TRIGGER boom BEFORE UPDATE ON books WHEN NEW.id = 12 BEGIN SELECT RAISE(ABORT, 'boom'); END;",
        )
        .unwrap();
        assert!(apply(&mut conn, "abc", "Xavier Yu", 3, None).is_err());
        let name: String = conn
            .query_row("SELECT name FROM authors WHERE id = 1", [], |r| r.get(0))
            .unwrap();
        assert_eq!(name, "abc", "the author rename was rolled back");
        assert_eq!(
            sort_of(&conn, 10),
            "abc",
            "and so was book 10, which was updated before the failure"
        );
        let dirty: i64 = conn
            .query_row("SELECT count(*) FROM metadata_dirtied", [], |r| r.get(0))
            .unwrap();
        assert_eq!(dirty, 0);
    }

    #[test]
    fn a_backup_is_a_readable_copy_taken_before_the_change() {
        let dir = tempfile::TempDir::new().unwrap();
        let path = dir.path().join("metadata.db");
        {
            let conn = Connection::open(&path).unwrap();
            conn.execute_batch(
                "CREATE TABLE authors (id INTEGER PRIMARY KEY, name TEXT NOT NULL COLLATE NOCASE, sort TEXT);
                 INSERT INTO authors VALUES (1, 'abc', 'abc');",
            )
            .unwrap();
        }
        let conn = open_library(&path).unwrap();
        let copy = backup(&conn, &dir.path().join("backups")).unwrap();
        conn.execute("UPDATE authors SET name = 'changed'", [])
            .unwrap();
        let old: String = Connection::open(&copy)
            .unwrap()
            .query_row("SELECT name FROM authors", [], |r| r.get(0))
            .unwrap();
        assert_eq!(old, "abc");
    }
}
