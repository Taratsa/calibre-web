//! Shared pieces of the book editor port: the library's `title_sort` and the settings it needs.
//!
//! `title_sort` is the function Calibre registers on its connection and the triggers of `metadata.db` call
//! (`books_update_trg`, `series_insert_trg`, ...). Flask registers `db.title_sort` with `config_title_regex`
//! (`cps/db.py: create_functions`); a writing connection here must do the same or a title or series edit stores a
//! wrong sort. Vectors in `tests/data/title_sort.json` come from Flask's own function with the live regex.

use crate::filename::strip_whitespaces;
use regex::{Regex, RegexBuilder};
use std::path::Path;

/// Calibre-Web's default `config_title_regex`, used when the setting is missing or is not a valid pattern.
const DEFAULT_TITLE_REGEX: &str = r"^(A|The|An)\s+";

/// The `title_sort` pattern: `config_title_regex`, compiled case-insensitively like `re.compile(.., re.IGNORECASE)`.
pub fn title_regex(app_db: &Path) -> Regex {
    let configured = crate::settings::open_read_only(app_db)
        .and_then(|conn| {
            conn.query_row(
                "SELECT config_title_regex FROM settings LIMIT 1",
                [],
                |row| row.get::<_, Option<String>>(0),
            )
        })
        .ok()
        .flatten();
    configured
        .as_deref()
        .and_then(compile)
        .unwrap_or_else(|| compile(DEFAULT_TITLE_REGEX).expect("the default pattern is valid"))
}

fn compile(pattern: &str) -> Option<Regex> {
    RegexBuilder::new(pattern)
        .case_insensitive(true)
        .build()
        .ok()
}

/// `db.title_sort(title, config)`: a leading article moves to the end (`The Book` -> `Book, The`), then the result is
/// stripped. The first capture group is the article, exactly as in Flask.
pub fn title_sort(regex: &Regex, title: &str) -> String {
    let moved = regex
        .captures(title)
        .and_then(|captures| captures.get(1))
        .map(|prefix| {
            let rest: String = title
                .chars()
                .skip(prefix.as_str().chars().count())
                .collect();
            format!("{rest}, {}", prefix.as_str())
        });
    strip_whitespaces(moved.as_deref().unwrap_or(title)).to_owned()
}

// ---------------------------------------------------------------------------------------------------------------------
// Saving one field of one book (`edit_book_param` in `cps/editbooks.py`), with the folder and file moves of
// `helper.update_dir_structure`. Everything runs in ONE transaction; the file moves happen before the commit and are
// undone if anything fails, so the database and the folders cannot disagree (Flask rolls the database back but leaves a
// moved folder where it is).

use crate::authors::sorted_author;
use rusqlite::{Connection, OptionalExtension, Transaction, params};
use std::path::PathBuf;

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Field {
    Title,
    Authors,
    Tags,
    Series,
    Publishers,
    Languages,
}

impl Field {
    pub const ALL: [Field; 6] = [
        Field::Title,
        Field::Authors,
        Field::Tags,
        Field::Series,
        Field::Publishers,
        Field::Languages,
    ];

    pub fn parse(name: &str) -> Option<Field> {
        Field::ALL.into_iter().find(|field| field.key() == name)
    }

    pub fn key(self) -> &'static str {
        match self {
            Field::Title => "title",
            Field::Authors => "authors",
            Field::Tags => "tags",
            Field::Series => "series",
            Field::Publishers => "publishers",
            Field::Languages => "languages",
        }
    }
}

#[derive(Debug, PartialEq, Eq)]
pub enum SaveError {
    NotFound,
    /// Something the person typed (an unknown language, an empty file name).
    Invalid(String),
    /// A folder or file could not be moved; nothing was changed.
    Files(String),
    Db(String),
}

impl SaveError {
    pub fn message(&self) -> String {
        match self {
            SaveError::NotFound => "Book not found".to_owned(),
            SaveError::Invalid(text) | SaveError::Files(text) | SaveError::Db(text) => text.clone(),
        }
    }
}

impl From<rusqlite::Error> for SaveError {
    fn from(error: rusqlite::Error) -> Self {
        SaveError::Db(format!("Database error: {error}"))
    }
}

/// What a save needs to know about the installation and the person saving.
pub struct Env<'a> {
    pub library: &'a Path,
    /// `config_unicode_filename`: transliterate folder and file names.
    pub unicode: bool,
    /// The editor's locale: language names are typed and shown in it.
    pub locale: &'a str,
}

/// `_("Unknown")` for the locales that have a catalog entry here; English otherwise.
pub fn unknown_word(locale: &str) -> &'static str {
    match locale.split(['_', '-']).next().unwrap_or("en") {
        "id" => "Tidak diketahui",
        "nl" => "Onbekend",
        _ => "Unknown",
    }
}

/// `helper.uniq`: whitespace runs collapse to one space, duplicates (exact) are dropped, order is kept.
fn uniq(items: Vec<String>) -> Vec<String> {
    let mut out: Vec<String> = Vec::new();
    for item in items {
        let item = item.split_whitespace().collect::<Vec<_>>().join(" ");
        if !out.contains(&item) {
            out.push(item);
        }
    }
    out
}

/// Which table and link table an object kind lives in (`db.Authors`, `db.Tags`, ...).
#[derive(Clone, Copy)]
struct Kind {
    /// A name typed in another letter case renames the shared row (tags, series, publishers), like
    /// `create_objects_for_addition`. Authors are linked as they are (see `set_linked`); language codes never change.
    recase: bool,
    table: &'static str,
    link: &'static str,
    link_column: &'static str,
    name_column: &'static str,
}

const AUTHORS: Kind = Kind {
    recase: false,
    table: "authors",
    link: "books_authors_link",
    link_column: "author",
    name_column: "name",
};
const TAGS: Kind = Kind {
    recase: true,
    table: "tags",
    link: "books_tags_link",
    link_column: "tag",
    name_column: "name",
};
const SERIES: Kind = Kind {
    recase: true,
    table: "series",
    link: "books_series_link",
    link_column: "series",
    name_column: "name",
};
const PUBLISHERS: Kind = Kind {
    recase: true,
    table: "publishers",
    link: "books_publishers_link",
    link_column: "publisher",
    name_column: "name",
};
const LANGUAGES: Kind = Kind {
    recase: false,
    table: "languages",
    link: "books_languages_link",
    link_column: "lang_code",
    name_column: "lang_code",
};

/// `modify_database_object` for one kind: make the book's links equal `inputs`, creating missing rows, renaming a row
/// whose only difference is the letter case (tags, series, publishers: it is the same row for every book), unlinking
/// what is no longer wanted and deleting a row nobody uses any more. Returns whether anything changed.
///
/// An existing AUTHOR typed in another case is linked as it is, never renamed: renaming an author renames it in every
/// book and moves their folders (`/admin/authors` does that, on purpose and with a preview).
fn set_linked(
    tx: &Transaction,
    kind: Kind,
    book_id: i64,
    inputs: &[String],
) -> rusqlite::Result<bool> {
    let mut wanted: Vec<String> = Vec::new();
    for input in inputs.iter().filter(|input| !input.is_empty()) {
        // Case-insensitive de-duplication: the link tables are UNIQUE(book, x) and "Zine" and "zine" are one row.
        if !wanted
            .iter()
            .any(|seen| seen.to_lowercase() == input.to_lowercase())
        {
            wanted.push(input.clone());
        }
    }
    let mut current: Vec<(i64, String)> = Vec::new();
    {
        let mut statement = tx.prepare(&format!(
            "SELECT t.id, t.{n} FROM {l} k JOIN {t} t ON t.id = k.{c} WHERE k.book = ?1 ORDER BY k.id",
            n = kind.name_column,
            l = kind.link,
            t = kind.table,
            c = kind.link_column
        ))?;
        let rows = statement.query_map([book_id], |row| Ok((row.get(0)?, row.get(1)?)))?;
        for row in rows {
            current.push(row?);
        }
    }
    let mut changed = false;
    // 1. find or create the row of every wanted name (case-insensitive, like the UNIQUE constraint)
    let mut targets: Vec<i64> = Vec::new();
    for name in &wanted {
        let found: Option<(i64, String)> = tx
            .query_row(
                &format!(
                    "SELECT id, {n} FROM {t} WHERE {n} = ?1 COLLATE NOCASE",
                    n = kind.name_column,
                    t = kind.table
                ),
                [name],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .optional()?;
        let id = match found {
            Some((id, stored)) => {
                if kind.recase && stored != *name {
                    tx.execute(
                        &format!("UPDATE {} SET name = ?2 WHERE id = ?1", kind.table),
                        params![id, name],
                    )?;
                    if kind.table == "publishers" {
                        tx.execute("UPDATE publishers SET sort = NULL WHERE id = ?1", [id])?;
                    }
                    changed = true;
                }
                id
            }
            None => {
                changed = true;
                match kind.table {
                    "authors" => tx.execute(
                        "INSERT INTO authors (name, sort) VALUES (?1, ?2)",
                        params![name, sorted_author(&name.replace('|', ","))],
                    )?,
                    "publishers" => tx.execute(
                        "INSERT INTO publishers (name, sort) VALUES (?1, NULL)",
                        [name],
                    )?,
                    table => tx.execute(
                        &format!("INSERT INTO {table} ({}) VALUES (?1)", kind.name_column),
                        [name],
                    )?,
                };
                tx.last_insert_rowid()
            }
        };
        targets.push(id);
    }
    // 2. unlink what is not wanted (before linking: series and publisher links are UNIQUE(book))
    for (id, _) in &current {
        if targets.contains(id) {
            continue;
        }
        tx.execute(
            &format!(
                "DELETE FROM {} WHERE book = ?1 AND {} = ?2",
                kind.link, kind.link_column
            ),
            params![book_id, id],
        )?;
        changed = true;
        let left: i64 = tx.query_row(
            &format!(
                "SELECT count(*) FROM {} WHERE {} = ?1",
                kind.link, kind.link_column
            ),
            [id],
            |row| row.get(0),
        )?;
        if left == 0 {
            tx.execute(&format!("DELETE FROM {} WHERE id = ?1", kind.table), [id])?;
        }
    }
    // 3. link what is new, in the order typed
    for id in &targets {
        if current.iter().any(|(existing, _)| existing == id) {
            continue;
        }
        tx.execute(
            &format!(
                "INSERT INTO {} (book, {}) VALUES (?1, ?2)",
                kind.link, kind.link_column
            ),
            params![book_id, id],
        )?;
        changed = true;
    }
    Ok(changed)
}

// --- folders and files -------------------------------------------------------------------------------------------------

/// A filesystem change made for a save, so it can be undone when the database write fails.
#[derive(Debug)]
enum Undo {
    Rename { from: PathBuf, to: PathBuf },
}

/// The moves of one save. `finish` runs after the commit; `undo` runs when anything before it failed.
#[derive(Default)]
struct Moves {
    done: Vec<Undo>,
    /// Old folders to remove once the commit succeeded, if they are empty (`shutil.rmtree` of an emptied author dir).
    cleanup: Vec<PathBuf>,
}

impl Moves {
    fn rename(&mut self, from: PathBuf, to: PathBuf) -> std::io::Result<()> {
        if let Some(parent) = to.parent()
            && let Err(error) = std::fs::create_dir_all(parent)
            // Someone else already made the folder (the book folder itself was renamed there): the error of the rename
            // that follows says what really happened.
            && !parent.is_dir()
        {
            return Err(error);
        }
        std::fs::rename(&from, &to)?;
        self.done.push(Undo::Rename { from, to });
        Ok(())
    }

    fn undo(self) {
        for step in self.done.into_iter().rev() {
            let Undo::Rename { from, to } = step;
            if let Err(error) = std::fs::rename(&to, &from) {
                tracing::error!(
                    "cannot undo the move {} -> {}: {error}",
                    from.display(),
                    to.display()
                );
            }
        }
    }

    fn finish(self) {
        for dir in self.cleanup {
            remove_if_empty_tree(&dir);
        }
    }
}

/// Remove `dir` when it holds no files (empty sub folders count as empty), then its parent when that is empty too.
fn remove_if_empty_tree(dir: &Path) {
    fn has_files(dir: &Path) -> bool {
        std::fs::read_dir(dir).map_or(true, |entries| {
            entries.flatten().any(|entry| {
                let path = entry.path();
                if path.is_dir() {
                    has_files(&path)
                } else {
                    true
                }
            })
        })
    }
    if dir.is_dir()
        && !has_files(dir)
        && let Err(error) = std::fs::remove_dir_all(dir)
    {
        tracing::error!(
            "cannot remove the emptied folder {}: {error}",
            dir.display()
        );
        return;
    }
    if let Some(parent) = dir.parent()
        && parent.is_dir()
        && std::fs::read_dir(parent).is_ok_and(|mut entries| entries.next().is_none())
        && let Err(error) = std::fs::remove_dir(parent)
    {
        tracing::error!(
            "cannot remove the empty author folder {}: {error}",
            parent.display()
        );
    }
}

struct BookRow {
    title: String,
    path: String,
    author_sort: String,
}

struct DataRow {
    format: String,
    name: String,
}

fn book_row(tx: &Transaction, id: i64) -> Result<BookRow, SaveError> {
    tx.query_row(
        "SELECT title, path, COALESCE(author_sort, '') FROM books WHERE id = ?1",
        [id],
        |row| {
            Ok(BookRow {
                title: row.get(0)?,
                path: row.get(1)?,
                author_sort: row.get(2)?,
            })
        },
    )
    .optional()?
    .ok_or(SaveError::NotFound)
}

fn data_rows(tx: &Transaction, id: i64) -> rusqlite::Result<Vec<DataRow>> {
    let mut statement = tx.prepare("SELECT format, name FROM data WHERE book = ?1 ORDER BY id")?;
    let rows = statement.query_map([id], |row| {
        Ok(DataRow {
            format: row.get(0)?,
            name: row.get(1)?,
        })
    })?;
    rows.collect()
}

/// `get_valid_filename(.., chars=n)` as a `Result`: an empty result is Flask's "Filename cannot be empty".
fn folder_name(env: &Env, value: &str, chars: usize) -> Result<String, SaveError> {
    crate::filename::library_name(value, chars, env.unicode)
        .ok_or_else(|| SaveError::Invalid("Filename cannot be empty".to_owned()))
}

/// `helper.update_dir_structure_file`: move the book folder to `<author>/<title> (<id>)` and rename the format files to
/// `<title> - <author>`, writing the new `books.path` and `data.name` in the transaction. `first_author` is `None` for a
/// title edit (the author folder stays, and the file name keeps the OLD author folder name, as in Flask).
/// Returns the moves so the caller can undo or finish them.
fn relocate(
    tx: &Transaction,
    env: &Env,
    book_id: i64,
    title: &str,
    first_author: Option<&str>,
    moves: &mut Moves,
) -> Result<(), SaveError> {
    let book = book_row(tx, book_id)?;
    let Some((author_dir, title_dir)) = book.path.split_once('/') else {
        // Flask would raise on a path that is not `<author>/<title>`; leave such a book where it is.
        return Err(SaveError::Files(format!(
            "The folder of book {book_id} ({}) is not <author>/<title>, so it cannot be renamed",
            book.path
        )));
    };
    let new_title_dir = format!("{} ({book_id})", folder_name(env, title, 96)?);
    let (new_author_dir, author_for_file) = match first_author {
        Some(author) => (folder_name(env, author, 96)?, author.to_owned()),
        None => (author_dir.to_owned(), author_dir.to_owned()),
    };
    if title_dir == new_title_dir && author_dir == new_author_dir {
        return Ok(());
    }
    let old = env.library.join(&book.path);
    let new = env.library.join(&new_author_dir).join(&new_title_dir);
    let described = |error: &std::io::Error| {
        SaveError::Files(format!(
            "Rename title from: '{}' to '{}' failed with error: {error}",
            old.display(),
            new.display()
        ))
    };
    if !new.exists() {
        if let Err(error) = moves.rename(old.clone(), new.clone()) {
            return Err(described(&error));
        }
    } else {
        // The target folder exists already (a leftover): move the files into it, like Flask's merge branch.
        for entry in walk_files(&old) {
            let target = new.join(entry.strip_prefix(&old).unwrap_or(&entry));
            if let Err(error) = moves.rename(entry, target) {
                return Err(described(&error));
            }
        }
    }
    moves.cleanup.push(old.clone());
    tx.execute(
        "UPDATE books SET path = ?2 WHERE id = ?1",
        params![book_id, format!("{new_author_dir}/{new_title_dir}")],
    )?;
    // Rename every format file: `<title (42)> - <author (42)>.<fmt>`.
    let file_stem = format!(
        "{} - {}",
        folder_name(env, title, 42)?,
        folder_name(env, &author_for_file, 42)?
    );
    for data in data_rows(tx, book_id)? {
        let extension = data.format.to_lowercase();
        let from = new.join(format!("{}.{extension}", data.name));
        let to = new.join(format!("{file_stem}.{extension}"));
        if from == to {
            continue;
        }
        // A format whose FILE is already missing (a broken copy in the library) cannot be moved. Unlike Flask, which
        // reports it after the folder move and then leaves the database rolled back with the folder moved, this keeps
        // the database row as it is and only renames the file it finds: the missing one is reported in the log.
        if !from.exists() {
            tracing::warn!(
                "book {book_id}: {} is missing, its row keeps the old name {from:?}",
                from.display()
            );
            continue;
        }
        if let Err(error) = moves.rename(from, to) {
            return Err(SaveError::Files(format!(
                "Moving book path of Book {book_id} to: '{}' failed with error: {error}",
                new.display()
            )));
        }
        tx.execute(
            "UPDATE data SET name = ?3 WHERE book = ?1 AND format = ?2",
            params![book_id, data.format, file_stem],
        )?;
    }
    Ok(())
}

/// Every file below `dir`, recursively (`os.walk`).
fn walk_files(dir: &Path) -> Vec<PathBuf> {
    let mut found = Vec::new();
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                found.extend(walk_files(&path));
            } else {
                found.push(path);
            }
        }
    }
    found
}

// --- saving one field ---------------------------------------------------------------------------------------------------

/// The outcome of a successful save, in the shape the manager cell shows.
#[derive(Debug, PartialEq, Eq)]
pub struct Saved {
    /// Whether the book was actually modified (an identical value changes nothing).
    pub changed: bool,
}

fn normalize_authors(value: &str, unknown: &str) -> Vec<String> {
    // `prepare_authors`: split on `&`, `,` becomes `|` (the stored form), duplicates dropped, empty means Unknown.
    let parts = value
        .split('&')
        .map(|part| strip(part).replace(',', "|"))
        .collect::<Vec<_>>();
    let parts = uniq(parts);
    if parts == [String::new()] {
        vec![unknown.to_owned()]
    } else {
        parts
    }
}

fn strip(text: &str) -> &str {
    strip_whitespaces(text)
}

/// `edit_book_param` for one field of one book. `checkT`/`checkA` are always on in the manager: a title edit refreshes
/// the sort (the `books_update_trg` trigger does it with the registered `title_sort`), an author edit refreshes
/// `author_sort`.
pub fn save_field(
    conn: &mut Connection,
    env: &Env,
    book_id: i64,
    field: Field,
    value: &str,
) -> Result<Saved, SaveError> {
    let mut moves = Moves::default();
    let tx = conn.transaction()?;
    let outcome = apply_field(&tx, env, book_id, field, value, &mut moves);
    match outcome {
        Ok(changed) => {
            if changed {
                tx.execute(
                    "UPDATE books SET last_modified = ?2 WHERE id = ?1",
                    params![book_id, crate::authors::now_stamp()],
                )?;
                tx.execute(
                    "INSERT OR IGNORE INTO metadata_dirtied (book) VALUES (?1)",
                    [book_id],
                )?;
            }
            match tx.commit() {
                Ok(()) => {
                    moves.finish();
                    Ok(Saved { changed })
                }
                Err(error) => {
                    moves.undo();
                    Err(error.into())
                }
            }
        }
        Err(error) => {
            // The transaction rolls back when it is dropped; put the folders back too.
            drop(tx);
            moves.undo();
            Err(error)
        }
    }
}

fn apply_field(
    tx: &Transaction,
    env: &Env,
    book_id: i64,
    field: Field,
    value: &str,
    moves: &mut Moves,
) -> Result<bool, SaveError> {
    let book = book_row(tx, book_id)?;
    match field {
        Field::Title => {
            let mut title = strip(value).to_owned();
            if book.title == title {
                return Ok(false);
            }
            if title.is_empty() {
                title = unknown_word(env.locale).to_owned();
            }
            tx.execute(
                "UPDATE books SET title = ?2 WHERE id = ?1",
                params![book_id, title],
            )?;
            relocate(tx, env, book_id, &title, None, moves)?;
            Ok(true)
        }
        Field::Authors => {
            let inputs = normalize_authors(value, unknown_word(env.locale));
            let sorts: Vec<String> = inputs
                .iter()
                .map(|name| {
                    let stored: Option<Option<String>> = tx
                        .query_row("SELECT sort FROM authors WHERE name = ?1", [name], |row| {
                            row.get(0)
                        })
                        .optional()
                        .ok()
                        .flatten();
                    let sort = match stored {
                        Some(Some(sort)) => sort,
                        _ => sorted_author(&name.replace('|', ",")),
                    };
                    sorted_author(&sort)
                })
                .collect();
            let author_sort = sorts.join(" & ");
            let mut changed = false;
            if book.author_sort != author_sort {
                tx.execute(
                    "UPDATE books SET author_sort = ?2 WHERE id = ?1",
                    params![book_id, author_sort],
                )?;
                changed = true;
            }
            changed |= set_linked(tx, AUTHORS, book_id, &inputs)?;
            relocate(tx, env, book_id, &book.title, Some(&inputs[0]), moves)?;
            Ok(changed)
        }
        Field::Tags => {
            let inputs = uniq(value.split(',').map(|tag| strip(tag).to_owned()).collect());
            Ok(set_linked(tx, TAGS, book_id, &inputs)?)
        }
        Field::Series => {
            let series = strip(value).to_owned();
            Ok(set_linked(tx, SERIES, book_id, &[series])?)
        }
        Field::Publishers => {
            let publisher = strip(value).to_owned();
            Ok(set_linked(tx, PUBLISHERS, book_id, &[publisher])?)
        }
        Field::Languages => {
            let mut codes = Vec::new();
            let mut unknown = Vec::new();
            let table = crate::suggest::names_for(env.locale);
            let mut typed: Vec<String> = value
                .split(',')
                .map(|name| strip(name).to_lowercase())
                .filter(|name| !name.is_empty())
                .collect();
            typed.sort();
            typed.dedup();
            let mut remaining = typed.clone();
            // `get_language_code_from_name`: walk the locale's table, so codes come out in table order.
            for (code, name) in table {
                let lower = name.to_lowercase();
                if let Some(position) = remaining.iter().position(|typed| *typed == lower) {
                    codes.push((*code).to_owned());
                    remaining.remove(position);
                }
            }
            unknown.extend(remaining);
            if !unknown.is_empty() {
                return Err(SaveError::Invalid(format!(
                    "Invalid languages in request: {}",
                    unknown.join(",")
                )));
            }
            Ok(set_linked(tx, LANGUAGES, book_id, &uniq(codes))?)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn title_sort_matches_flask() {
        let live = r"^(A|The|An|Der|Die|Das|Den|Ein|Eine|Einen|Dem|Des|Einem|Eines|Le|La|Les|L\'|Un|Une)\s+";
        let regex = compile(live).expect("the live pattern compiles in Rust");
        let vectors: Vec<(String, String)> =
            serde_json::from_str(include_str!("../tests/data/title_sort.json")).unwrap();
        assert_eq!(vectors.len(), 33);
        for (title, expected) in vectors {
            assert_eq!(title_sort(&regex, &title), expected, "{title:?}");
        }
    }

    #[test]
    fn a_missing_or_broken_setting_falls_back_to_the_default_pattern() {
        let dir = tempfile::TempDir::new().unwrap();
        let db = dir.path().join("app.db");
        rusqlite::Connection::open(&db)
            .unwrap()
            .execute_batch("CREATE TABLE settings (config_title_regex TEXT); INSERT INTO settings VALUES ('(unclosed');")
            .unwrap();
        assert_eq!(title_sort(&title_regex(&db), "The Book"), "Book, The");
        assert_eq!(
            title_sort(&title_regex(&dir.path().join("none.db")), "An Apple"),
            "Apple, An"
        );
    }

    // --- saving a field -------------------------------------------------------------------------------------------

    use crate::authors::open_library;

    struct Lab {
        dir: tempfile::TempDir,
        conn: Connection,
    }

    impl Lab {
        fn new() -> Lab {
            let dir = tempfile::TempDir::new().unwrap();
            let folder = dir.path().join("Old Author/Old Title (7)");
            std::fs::create_dir_all(&folder).unwrap();
            std::fs::write(folder.join("Old Title - Old Author.pdf"), b"pdf").unwrap();
            std::fs::write(folder.join("cover.jpg"), b"jpg").unwrap();
            drop(Connection::open(dir.path().join("metadata.db")).unwrap());
            let conn = open_library(
                &dir.path().join("metadata.db"),
                Some(compile(r"^(A|The|An)\s+").unwrap()),
            )
            .unwrap();
            conn.execute_batch(
                "CREATE TABLE books (id INTEGER PRIMARY KEY, title TEXT NOT NULL COLLATE NOCASE, sort TEXT, author_sort TEXT,
                    path TEXT, last_modified TIMESTAMP, series_index REAL DEFAULT 1);
                 CREATE TABLE authors (id INTEGER PRIMARY KEY, name TEXT NOT NULL COLLATE NOCASE UNIQUE, sort TEXT COLLATE NOCASE, link TEXT NOT NULL DEFAULT '');
                 CREATE TABLE books_authors_link (id INTEGER PRIMARY KEY, book INTEGER NOT NULL, author INTEGER NOT NULL, UNIQUE(book, author));
                 CREATE TABLE tags (id INTEGER PRIMARY KEY, name TEXT NOT NULL COLLATE NOCASE UNIQUE);
                 CREATE TABLE books_tags_link (id INTEGER PRIMARY KEY, book INTEGER NOT NULL, tag INTEGER NOT NULL, UNIQUE(book, tag));
                 CREATE TABLE series (id INTEGER PRIMARY KEY, name TEXT NOT NULL COLLATE NOCASE UNIQUE, sort TEXT);
                 CREATE TABLE books_series_link (id INTEGER PRIMARY KEY, book INTEGER NOT NULL UNIQUE, series INTEGER NOT NULL);
                 CREATE TABLE publishers (id INTEGER PRIMARY KEY, name TEXT NOT NULL COLLATE NOCASE UNIQUE, sort TEXT);
                 CREATE TABLE books_publishers_link (id INTEGER PRIMARY KEY, book INTEGER NOT NULL UNIQUE, publisher INTEGER NOT NULL);
                 CREATE TABLE languages (id INTEGER PRIMARY KEY, lang_code TEXT NOT NULL COLLATE NOCASE UNIQUE);
                 CREATE TABLE books_languages_link (id INTEGER PRIMARY KEY, book INTEGER NOT NULL, lang_code INTEGER NOT NULL, UNIQUE(book, lang_code));
                 CREATE TABLE data (id INTEGER PRIMARY KEY, book INTEGER NOT NULL, format TEXT NOT NULL COLLATE NOCASE, uncompressed_size INTEGER, name TEXT NOT NULL, UNIQUE(book, format));
                 CREATE TABLE metadata_dirtied (id INTEGER PRIMARY KEY, book INTEGER NOT NULL UNIQUE);
                 CREATE TRIGGER books_update_trg AFTER UPDATE ON books BEGIN
                    UPDATE books SET sort=title_sort(NEW.title) WHERE id=NEW.id AND OLD.title <> NEW.title; END;
                 INSERT INTO books (id, title, author_sort, path) VALUES (7, 'Old Title', 'Author, Old', 'Old Author/Old Title (7)');
                 INSERT INTO authors VALUES (1, 'Old Author', 'Author, Old', '');
                 INSERT INTO books_authors_link (book, author) VALUES (7, 1);
                 INSERT INTO data (book, format, uncompressed_size, name) VALUES (7, 'PDF', 3, 'Old Title - Old Author');",
            )
            .unwrap();
            Lab { dir, conn }
        }

        fn env(&self) -> Env<'_> {
            Env {
                library: self.dir.path(),
                unicode: false,
                locale: "en",
            }
        }

        fn save(&mut self, field: Field, value: &str) -> Result<Saved, SaveError> {
            let library = self.dir.path().to_path_buf();
            let env = Env {
                library: &library,
                unicode: false,
                locale: "en",
            };
            save_field(&mut self.conn, &env, 7, field, value)
        }

        fn one(&self, sql: &str) -> String {
            use rusqlite::types::Value;
            match self
                .conn
                .query_row(sql, [], |row| row.get::<_, Value>(0))
                .unwrap()
            {
                Value::Null => String::new(),
                Value::Integer(n) => n.to_string(),
                Value::Real(x) => x.to_string(),
                Value::Text(text) => text,
                Value::Blob(_) => String::from("<blob>"),
            }
        }
    }

    #[test]
    fn a_title_edit_moves_the_folder_renames_the_file_and_keeps_the_author_folder() {
        let mut lab = Lab::new();
        assert_eq!(
            lab.save(Field::Title, "  The New: Title?  "),
            Ok(Saved { changed: true })
        );
        assert_eq!(lab.one("SELECT title FROM books"), "The New: Title?");
        assert_eq!(
            lab.one("SELECT sort FROM books"),
            "New: Title?, The",
            "title_sort ran through the trigger"
        );
        assert_eq!(
            lab.one("SELECT path FROM books"),
            "Old Author/The New_ Title_ (7)"
        );
        assert_eq!(
            lab.one("SELECT name FROM data"),
            "The New_ Title_ - Old Author"
        );
        let folder = lab.dir.path().join("Old Author/The New_ Title_ (7)");
        assert!(folder.join("The New_ Title_ - Old Author.pdf").is_file());
        assert!(folder.join("cover.jpg").is_file());
        assert!(!lab.dir.path().join("Old Author/Old Title (7)").exists());
        assert_eq!(lab.one("SELECT count(*) FROM metadata_dirtied"), "1");
        assert!(
            lab.one("SELECT last_modified FROM books")
                .ends_with("+00:00")
        );
        assert_eq!(
            lab.save(Field::Title, "The New: Title?"),
            Ok(Saved { changed: false }),
            "same value, nothing to do"
        );
    }

    #[test]
    fn an_author_edit_moves_to_the_new_author_folder_and_removes_the_emptied_one() {
        let mut lab = Lab::new();
        assert_eq!(
            lab.save(Field::Authors, "Doe, John & Mary Roe"),
            Ok(Saved { changed: true })
        );
        assert_eq!(
            lab.one("SELECT author_sort FROM books"),
            "Doe, John & Roe, Mary"
        );
        assert_eq!(lab.one("SELECT path FROM books"), "Doe, John/Old Title (7)");
        assert_eq!(lab.one("SELECT name FROM data"), "Old Title - Doe, John");
        assert!(
            lab.dir
                .path()
                .join("Doe, John/Old Title (7)/Old Title - Doe, John.pdf")
                .is_file()
        );
        assert!(
            !lab.dir.path().join("Old Author").exists(),
            "the emptied author folder is removed"
        );
        // names are stored with `|` for the comma, and the unused old author row is gone
        assert_eq!(
            lab.one("SELECT group_concat(name, ';') FROM (SELECT name FROM authors ORDER BY id)"),
            "Doe| John;Mary Roe"
        );
    }

    #[test]
    fn a_format_file_that_is_already_missing_does_not_stop_the_move() {
        let mut lab = Lab::new();
        // the row names a file that is not on disk, as 22749 in the archive does
        lab.conn
            .execute(
                "INSERT INTO data (book, format, uncompressed_size, name) VALUES (7, 'EPUB', 3, 'Gone')",
                [],
            )
            .unwrap();
        assert_eq!(lab.save(Field::Title, "Moved"), Ok(Saved { changed: true }));
        assert!(
            lab.dir
                .path()
                .join("Old Author/Moved (7)/Moved - Old Author.pdf")
                .is_file()
        );
        assert_eq!(
            lab.one("SELECT count(*) FROM data WHERE name = 'Gone'"),
            "1",
            "the row keeps its old name"
        );
    }

    #[test]
    fn a_failure_after_the_move_puts_the_folder_and_the_database_back() {
        let mut lab = Lab::new();
        lab.conn
            .execute_batch(
                "CREATE TRIGGER boom BEFORE UPDATE OF name ON data BEGIN SELECT RAISE(ABORT, 'boom'); END;",
            )
            .unwrap();
        let error = lab.save(Field::Title, "Another").unwrap_err();
        assert!(error.message().contains("boom"), "{error:?}");
        assert_eq!(
            lab.one("SELECT title FROM books"),
            "Old Title",
            "the database rolled back"
        );
        assert_eq!(
            lab.one("SELECT path FROM books"),
            "Old Author/Old Title (7)"
        );
        let folder = lab.dir.path().join("Old Author/Old Title (7)");
        assert!(
            folder.join("Old Title - Old Author.pdf").is_file(),
            "the folder and file are back where they were"
        );
        assert!(!lab.dir.path().join("Old Author/Another (7)").exists());
    }

    #[test]
    fn tags_series_and_publishers_link_reuse_and_clean_up() {
        let mut lab = Lab::new();
        lab.save(Field::Tags, "zine, Zine, baru").unwrap();
        assert_eq!(lab.one("SELECT group_concat(name, ',') FROM (SELECT t.name FROM tags t JOIN books_tags_link l ON l.tag = t.id ORDER BY l.id)"), "zine,baru");
        lab.save(Field::Tags, "ZINE").unwrap();
        assert_eq!(
            lab.one("SELECT group_concat(name) FROM tags"),
            "ZINE",
            "a case-only change renames the shared tag; the unused one is deleted"
        );
        lab.save(Field::Series, "Seri A").unwrap();
        assert_eq!(
            lab.one("SELECT sort FROM series"),
            "",
            "the series sort comes from the registered trigger function in a real library"
        );
        lab.save(Field::Series, "").unwrap();
        assert_eq!(
            lab.one("SELECT count(*) FROM series"),
            "0",
            "an emptied series row is deleted"
        );
        lab.save(Field::Publishers, "Penerbit").unwrap();
        lab.save(Field::Publishers, "Penerbit Lain").unwrap();
        assert_eq!(
            lab.one("SELECT group_concat(name) FROM publishers"),
            "Penerbit Lain"
        );
    }

    #[test]
    fn languages_are_typed_by_name_and_an_unknown_one_changes_nothing() {
        let mut lab = Lab::new();
        lab.save(Field::Languages, "Indonesian, English").unwrap();
        assert_eq!(lab.one("SELECT group_concat(lang_code) FROM (SELECT g.lang_code FROM languages g JOIN books_languages_link l ON l.lang_code = g.id ORDER BY g.lang_code)"), "eng,ind");
        let error = lab.save(Field::Languages, "Klingonese").unwrap_err();
        assert_eq!(
            error,
            SaveError::Invalid("Invalid languages in request: klingonese".into())
        );
        // Flask reports the same error but then commits an EMPTY language list; here the languages stay
        assert_eq!(lab.one("SELECT count(*) FROM books_languages_link"), "2");
    }

    #[test]
    fn an_empty_author_becomes_unknown_in_the_editors_language() {
        let mut lab = Lab::new();
        lab.save(Field::Authors, "").unwrap();
        assert_eq!(lab.one("SELECT group_concat(name) FROM authors"), "Unknown");
        assert_eq!(lab.one("SELECT path FROM books"), "Unknown/Old Title (7)");
        assert_eq!(unknown_word("id"), "Tidak diketahui");
        assert!(lab.env().library.exists());
    }
}
