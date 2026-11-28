//! `POST /api/webhook/upload`: the upload bot's way of adding a book. Port of `cps/api.py: api_webhook_upload`, which
//! is `file_handling_on_upload` + `create_book_on_upload` + `update_dir_structure` for a single PDF or EPUB.
//!
//! The account must be signed in with `ROLE_UPLOAD` (the bot's `hermes` is). The metadata comes from `meta::epub` /
//! `meta::pdf` with Flask's `uploader.process()` fallbacks (a blank title is the file name, a blank or "unknown" author is
//! the editor's "Unknown"). The book is created in ONE transaction; the folder, the file and the cover are written inside
//! it and removed again when the commit fails, so a failed upload never leaves a half-made book.
//!
//! Differences from Flask, on purpose (documented in AGENTS.md): the comment is stored as uploaded (Flask sanitises it
//! with nh3 at write time; the book page sanitises on render), and the duplicate index is only marked pending (the
//! debounced scan belongs to Flask's worker until the queue is ported).

use crate::bookedit::title_regex;
use crate::meta::{self, UNKNOWN_AUTHOR};
use crate::{AppState, authdb, authors, filename, session, settings};
use axum::Router;
use axum::extract::{Multipart, State};
use axum::http::{HeaderMap, HeaderValue, StatusCode, header};
use axum::response::{IntoResponse, Response};
use axum::routing::post;
use rusqlite::{OptionalExtension, params};
use serde_json::{Value, json};
use std::path::Path;
use std::sync::Arc;

const ROLE_UPLOAD: i64 = 1 << 2;

pub fn routes() -> Router<Arc<AppState>> {
    Router::new().route("/api/webhook/upload", post(upload))
}

fn json_response(status: StatusCode, body: Value) -> Response {
    let mut response = (status, body.to_string()).into_response();
    let headers = response.headers_mut();
    headers.insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("application/json"),
    );
    headers.insert(
        header::CACHE_CONTROL,
        HeaderValue::from_static("private, no-store"),
    );
    headers.insert(
        header::HeaderName::from_static("cloudflare-cdn-cache-control"),
        HeaderValue::from_static("no-store"),
    );
    response
}

fn failure(status: StatusCode, message: impl Into<String>) -> Response {
    json_response(status, json!({ "error": message.into() }))
}

fn url_for(headers: &HeaderMap, book: i64) -> String {
    let host = headers
        .get(header::HOST)
        .and_then(|value| value.to_str().ok())
        .unwrap_or("");
    let scheme = headers
        .get("x-forwarded-proto")
        .and_then(|value| value.to_str().ok())
        .map_or("http", |value| {
            if value.starts_with("https") {
                "https"
            } else {
                "http"
            }
        });
    format!("{scheme}://{host}/book/{book}/")
}

/// `prepare_authors`: `&` separates, `,` is stored as `|`, duplicates dropped (whitespace collapsed), empty means
/// Unknown. `file_handling` keeps the first author's STORED form for the folder name.
fn author_names(author: &str, unknown: &str) -> Vec<String> {
    let mut out: Vec<String> = Vec::new();
    for part in author.split('&') {
        let name = filename::strip_whitespaces(part).replace(',', "|");
        let name = name.split_whitespace().collect::<Vec<_>>().join(" ");
        if !out.contains(&name) {
            out.push(name);
        }
    }
    if out == [String::new()] || out.is_empty() {
        return vec![unknown.to_owned()];
    }
    out
}

struct Created {
    book_id: i64,
    title: String,
    author: String,
    /// What the metadata reader found, for the answer.
    meta: meta::Meta,
}

/// Create the book, its folder, its file and its cover. `temporary` is the uploaded file on disk.
fn create_book(
    settings: &settings::Settings,
    app_db: &Path,
    locale: &str,
    temporary: &Path,
    extension: &str,
    stem: &str,
    static_dir: &Path,
) -> Result<Created, String> {
    let parsed = match extension {
        "pdf" => meta::pdf(temporary),
        _ => meta::epub(temporary),
    }
    .map_err(|error| format!("cannot read the file: {error}"))?;
    let unknown = if locale.starts_with("id") {
        "Tidak diketahui"
    } else {
        UNKNOWN_AUTHOR
    };
    let title = {
        let title = filename::strip_whitespaces(&parsed.title).to_owned();
        if title.is_empty() {
            stem.to_owned()
        } else {
            title
        }
    };
    let author = {
        let author = filename::strip_whitespaces(&parsed.author).to_owned();
        if author.is_empty() || author.to_lowercase() == "unknown" {
            unknown.to_owned()
        } else {
            author
        }
    };
    let names = author_names(&author, unknown);
    let library = settings.book_path();
    let mut conn = authors::open_library(&settings.metadata_db(), Some(title_regex(app_db)))
        .map_err(|error| error.to_string())?;
    let tx = conn.transaction().map_err(|error| error.to_string())?;

    // Author rows first (sorted like `prepare_authors_on_upload`).
    let mut sorts = Vec::new();
    let mut author_ids = Vec::new();
    for name in &names {
        let stored: Option<(i64, Option<String>)> = tx
            .query_row(
                "SELECT id, sort FROM authors WHERE name = ?1 COLLATE NOCASE",
                [name],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .optional()
            .map_err(|error| error.to_string())?;
        match stored {
            Some((id, sort)) => {
                author_ids.push(id);
                sorts.push(sort.unwrap_or_else(|| authors::sorted_author(&name.replace('|', ","))));
            }
            None => {
                tx.execute(
                    "INSERT INTO authors (name, sort) VALUES (?1, ?2)",
                    params![name, authors::sorted_author(&name.replace('|', ","))],
                )
                .map_err(|error| error.to_string())?;
                author_ids.push(tx.last_insert_rowid());
                sorts.push(authors::sorted_author(&name.replace('|', ",")));
            }
        }
    }
    let author_sort = sorts.join(" & ");
    let author_dir = names[0].replace('|', ",");
    let author_dir = filename::library_name(&author_dir, 96, settings.unicode_filename)
        .ok_or("the author name leaves no folder name")?;
    let title_dir = filename::library_name(&title, 96, settings.unicode_filename)
        .ok_or("the title leaves no folder name")?;

    let stamp = authors::now_stamp();
    let pubdate = {
        let normalized = meta::normalize_pubdate(&parsed.pubdate);
        if normalized.is_empty() {
            "0101-01-01 00:00:00.000000".to_owned()
        } else {
            format!("{normalized} 00:00:00.000000")
        }
    };
    let series_index: f64 = parsed.series_id.trim().parse().unwrap_or(1.0);
    tx.execute(
        "INSERT INTO books (title, author_sort, timestamp, pubdate, series_index, last_modified, path, has_cover)
         VALUES (?1, ?2, ?3, ?4, ?5, ?3, '', 0)",
        params![title, author_sort, stamp, pubdate, series_index],
    )
    .map_err(|error| error.to_string())?;
    let book_id = tx.last_insert_rowid();
    let path = format!("{author_dir}/{title_dir} ({book_id})");
    let file_stem = format!(
        "{} - {}",
        filename::library_name(&title, 42, settings.unicode_filename)
            .ok_or("the title leaves no file name")?,
        filename::library_name(&names[0], 42, settings.unicode_filename)
            .ok_or("the author leaves no file name")?
    );
    for id in &author_ids {
        tx.execute(
            "INSERT INTO books_authors_link (book, author) VALUES (?1, ?2)",
            params![book_id, id],
        )
        .map_err(|error| error.to_string())?;
    }
    // The same object logic the manager uses: one row per name, reused case-insensitively.
    fn linked(
        tx: &rusqlite::Transaction,
        link_table: &str,
        link_column: &str,
        table: &str,
        table_column: &str,
        book: i64,
        values: &[String],
    ) -> rusqlite::Result<()> {
        for value in values.iter().filter(|value| !value.is_empty()) {
            let existing: Option<i64> = tx
                .query_row(
                    &format!("SELECT id FROM {table} WHERE {table_column} = ?1 COLLATE NOCASE"),
                    [value],
                    |row| row.get(0),
                )
                .optional()?;
            let id = match existing {
                Some(id) => id,
                None => {
                    tx.execute(
                        &format!("INSERT INTO {table} ({table_column}) VALUES (?1)"),
                        [value],
                    )?;
                    tx.last_insert_rowid()
                }
            };
            tx.execute(
                &format!("INSERT INTO {link_table} (book, {link_column}) VALUES (?1, ?2)"),
                params![book, id],
            )?;
        }
        Ok(())
    }
    linked(
        &tx,
        "books_series_link",
        "series",
        "series",
        "name",
        book_id,
        std::slice::from_ref(&parsed.series),
    )
    .map_err(|e| e.to_string())?;
    let tags: Vec<String> = parsed
        .tags
        .split(',')
        .map(|tag| filename::strip_whitespaces(tag).to_owned())
        .filter(|tag| !tag.is_empty())
        .collect();
    linked(
        &tx,
        "books_tags_link",
        "tag",
        "tags",
        "name",
        book_id,
        &tags,
    )
    .map_err(|e| e.to_string())?;
    linked(
        &tx,
        "books_publishers_link",
        "publisher",
        "publishers",
        "name",
        book_id,
        &[filename::strip_whitespaces(&parsed.publisher).to_owned()],
    )
    .map_err(|e| e.to_string())?;
    linked(
        &tx,
        "books_languages_link",
        "lang_code",
        "languages",
        "lang_code",
        book_id,
        &parsed.languages,
    )
    .map_err(|e| e.to_string())?;
    for (kind, value) in &parsed.identifiers {
        tx.execute(
            "INSERT OR IGNORE INTO identifiers (book, type, val) VALUES (?1, ?2, ?3)",
            params![book_id, kind, value],
        )
        .map_err(|error| error.to_string())?;
    }
    if !parsed.description.is_empty() {
        tx.execute(
            "INSERT INTO comments (book, text) VALUES (?1, ?2)",
            params![book_id, parsed.description],
        )
        .map_err(|error| error.to_string())?;
    }
    // The file and its cover; written before the commit, removed again if anything after this fails.
    let folder = library.join(&path);
    let final_file = folder.join(format!("{file_stem}.{extension}"));
    let mut written: Vec<std::path::PathBuf> = Vec::new();
    let write = (|| -> std::io::Result<()> {
        std::fs::create_dir_all(&folder)?;
        written.push(folder.clone());
        // The upload lives on the container's temporary filesystem, the library on a bind mount: a cross-device rename
        // fails (EXDEV), so fall back to copy + delete, which is what Flask's `shutil.move` does.
        if std::fs::rename(temporary, &final_file).is_err() {
            std::fs::copy(temporary, &final_file)?;
            let _ = std::fs::remove_file(temporary);
        }
        written.push(final_file.clone());
        Ok(())
    })();
    if let Err(error) = write {
        for path in written.iter().rev() {
            let _ = std::fs::remove_dir_all(path);
        }
        return Err(format!("cannot store the file: {error}"));
    }
    let size = std::fs::metadata(&final_file)
        .map(|m| m.len() as i64)
        .unwrap_or(0);
    tx.execute(
        "INSERT INTO data (book, format, uncompressed_size, name) VALUES (?1, ?2, ?3, ?4)",
        params![book_id, extension.to_uppercase(), size, file_stem],
    )
    .map_err(|error| error.to_string())?;
    // `move_coverfile`: an extracted cover, else the generic one, is copied to `cover.jpg`. `has_cover` stays 0, exactly
    // as the Flask route leaves it (the file is there for the folder layout; the cover endpoint uses its card).
    let real_cover = write_cover(&parsed.cover, &final_file, extension, &folder, static_dir);
    if real_cover {
        tx.execute("UPDATE books SET has_cover = 1 WHERE id = ?1", [book_id])
            .map_err(|error| error.to_string())?;
    }
    tx.execute(
        "UPDATE books SET path = ?2 WHERE id = ?1",
        params![book_id, path],
    )
    .map_err(|error| error.to_string())?;
    tx.execute(
        "INSERT OR IGNORE INTO metadata_dirtied (book) VALUES (?1)",
        [book_id],
    )
    .map_err(|error| error.to_string())?;
    tx.commit().map_err(|error| error.to_string())?;
    mark_duplicates_pending(app_db);
    let _ = std::fs::remove_file(temporary);
    Ok(Created {
        book_id,
        title,
        author,
        meta: parsed,
    })
}

/// Cover for the new book, Flask's `move_coverfile`: an EPUB's embedded image (converted when it is not a JPEG), the
/// first page of a PDF rendered by ImageMagick, or the generic cover. `has_cover` stays 0 exactly as the Flask route
/// leaves it; the file is there for the folder layout, and the cover endpoint uses its card.
fn write_cover(
    embedded: &Option<meta::Cover>,
    file: &Path,
    extension: &str,
    folder: &Path,
    static_dir: &Path,
) -> bool {
    let target = folder.join("cover.jpg");
    let written = if let Some(cover) = embedded {
        if cover.extension == "jpg" || cover.extension == "jpeg" {
            std::fs::write(&target, &cover.bytes).is_ok()
        } else {
            let source = folder.join(format!(".cover.{}", cover.extension));
            let converted = std::fs::write(&source, &cover.bytes).is_ok()
                && std::process::Command::new("convert")
                    .arg(&source)
                    .args(["-colorspace", "sRGB", "-quality", "92"])
                    .arg(&target)
                    .status()
                    .map(|status| status.success())
                    .unwrap_or(false);
            let _ = std::fs::remove_file(&source);
            converted
        }
    } else if extension == "pdf" {
        std::process::Command::new("convert")
            .args(["-density", "150"])
            .arg(format!("{}[0]", file.display()))
            .args([
                "-background",
                "white",
                "-alpha",
                "remove",
                "-alpha",
                "off",
                "-quality",
                "88",
            ])
            .arg(&target)
            .status()
            .map(|status| status.success() && target.is_file())
            .unwrap_or(false)
    } else {
        false
    };
    if !written {
        let generic = static_dir.join("generic_cover.jpg");
        if let Err(error) = std::fs::copy(&generic, &target) {
            tracing::warn!(
                "cannot write the generic cover into {}: {error}",
                folder.display()
            );
        }
        return false;
    }
    // The nightly Flask task also leaves a `cover.webp` in the folder (`create_original_cover_webp`); writing it here
    // means the folder is complete without waiting for that task.
    let webp = folder.join("cover.webp");
    let ok = std::process::Command::new("convert")
        .arg(&target)
        .args(["-colorspace", "sRGB"])
        .arg(&webp)
        .status()
        .map(|status| status.success())
        .unwrap_or(false);
    if !ok {
        tracing::warn!("cannot write {}: convert failed", webp.display());
    }
    true
}

/// `mark_duplicate_index_pending`: the next scan (Flask's scheduler, or the startup check) picks the new book up.
fn mark_duplicates_pending(app_db: &Path) {
    if let Ok(conn) = rusqlite::Connection::open(app_db) {
        let _ = conn.execute(
            "INSERT INTO duplicate_index_cache (id, scan_pending) VALUES (1, 1)
             ON CONFLICT(id) DO UPDATE SET scan_pending = 1",
            [],
        );
    }
}

async fn upload(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    mut form: Multipart,
) -> Response {
    let Ok(settings) = state.settings().await else {
        return failure(StatusCode::INTERNAL_SERVER_ERROR, "Settings unavailable");
    };
    let access = match session::identify(&state, &settings, &headers).await {
        Ok(session::Who::User(access)) => access,
        _ => return failure(StatusCode::UNAUTHORIZED, "Authentication required"),
    };
    if access.role & ROLE_UPLOAD == 0 {
        return failure(StatusCode::FORBIDDEN, "Upload permission required");
    }
    // The bot posts one file in `file`; Flask rejects anything but PDF and EPUB.
    let mut uploaded: Option<(String, Vec<u8>)> = None;
    loop {
        match form.next_field().await {
            Ok(Some(field)) => {
                if field.name() != Some("file") {
                    continue;
                }
                let name = field.file_name().unwrap_or("").to_owned();
                match field.bytes().await {
                    Ok(bytes) => uploaded = Some((name, bytes.to_vec())),
                    Err(error) => {
                        return failure(
                            StatusCode::BAD_REQUEST,
                            format!("cannot read the file: {error}"),
                        );
                    }
                }
                break;
            }
            Ok(None) => break,
            Err(error) => {
                return failure(
                    StatusCode::BAD_REQUEST,
                    format!("cannot read the form: {error}"),
                );
            }
        }
    }
    let Some((name, bytes)) = uploaded else {
        return failure(StatusCode::BAD_REQUEST, "No file provided");
    };
    let extension = name
        .rsplit_once('.')
        .map(|(_, ext)| ext.to_lowercase())
        .unwrap_or_default();
    if !matches!(extension.as_str(), "pdf" | "epub") {
        return failure(
            StatusCode::BAD_REQUEST,
            "Only PDF and EPUB files are allowed",
        );
    }
    let stem = name
        .rsplit_once('.')
        .map(|(stem, _)| stem.to_owned())
        .unwrap_or_else(|| name.clone());
    let temporary = std::env::temp_dir().join(format!(
        "pustaka-upload-{}.{}",
        crate::random::hex(8),
        extension
    ));
    if let Err(error) = std::fs::write(&temporary, &bytes) {
        return failure(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("cannot store the upload: {error}"),
        );
    }
    let (app_db, user_locale, settings_copy, static_dir) = (
        state.app_db.clone(),
        access.id,
        (*settings).clone(),
        state.static_directory.clone(),
    );
    let locale = settings::open_read_only(&app_db)
        .and_then(|conn| {
            conn.query_row(
                "SELECT locale FROM user WHERE id = ?1",
                [user_locale],
                |row| row.get::<_, Option<String>>(0),
            )
        })
        .ok()
        .flatten()
        .unwrap_or_else(|| "en".to_owned());
    let outcome = tokio::task::spawn_blocking(move || {
        let created = create_book(
            &settings_copy,
            &app_db,
            &locale,
            &temporary,
            &extension,
            &stem,
            &static_dir,
        );
        let _ = std::fs::remove_file(&temporary);
        created
    })
    .await;
    match outcome {
        Ok(Ok(created)) => {
            let (app_db, user, ip) = (
                state.app_db.clone(),
                access.id,
                crate::twofa::client_ip(&headers),
            );
            let details = format!("API upload: {}", created.title);
            let _ = tokio::task::spawn_blocking(move || {
                authdb::audit_resource(
                    &app_db,
                    user,
                    "upload",
                    "book",
                    Some(&created.book_id.to_string()),
                    &details,
                    &ip,
                );
            })
            .await;
            tracing::info!(
                "upload: book {} ({}) created by user {}",
                created.book_id,
                created.title,
                access.id
            );
            json_response(
                StatusCode::OK,
                json!({
                    "book_id": created.book_id,
                    "title": created.title,
                    "author": created.author,
                    "description": created.meta.description,
                    "publisher": created.meta.publisher,
                    "series": created.meta.series,
                    "series_id": created.meta.series_id,
                    "languages": created.meta.languages.join(","),
                    "tags": created.meta.tags,
                    "pubdate": created.meta.pubdate,
                    "url": url_for(&headers, created.book_id),
                }),
            )
        }
        Ok(Err(error)) => {
            tracing::error!("upload failed: {error}");
            failure(StatusCode::INTERNAL_SERVER_ERROR, error)
        }
        Err(error) => {
            tracing::error!("upload task failed: {error}");
            failure(StatusCode::INTERNAL_SERVER_ERROR, "error")
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn author_names_follow_prepare_authors() {
        assert_eq!(author_names("Doe, John", "Unknown"), vec!["Doe| John"]);
        assert_eq!(author_names("A & B", "Unknown"), vec!["A", "B"]);
        assert_eq!(author_names("  ", "Unknown"), vec!["Unknown"]);
        assert_eq!(
            author_names("unknown", "Unknown"),
            vec!["unknown"],
            "the caller decides the Unknown fallback"
        );
        assert_eq!(author_names("A & A", "Unknown"), vec!["A"]);
    }
}
