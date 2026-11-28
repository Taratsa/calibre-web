//! `GET|POST /api/webhook/check`: "does the library already have this book?", the pre-upload check of the upload bot
//! (`cps/api.py: api_webhook_check`). JSON for a signed-in account; no CSRF, like the Flask route the bot used.
//!
//! Ported because the Flask route raises on its author branch: `query.join(db.Authors)` has no left side for a
//! many-to-many, so ANY request with `author=` answered 500 (reproduced on the sandbox; the SQLAlchemy error is
//! "Don't know how to join to Authors"). The filter here joins through `books_authors_link` and matches the name OR the
//! sort, which is what the Flask code meant.
//!
//! Everything else follows Flask: the title is split into words (`[^\w\s.]` removed), words of 1-2 characters and a
//! stopword list are dropped, every remaining word must appear in the title, and the author (when given) must match one
//! author. A title that yields no words sets `partial` and filters nothing (Flask then returns the first ten books).
//! `is_duplicate` comes from the duplicate index (`duplicate_book_key` + the fingerprint the last scan wrote).

use crate::{AppState, session, settings};
use axum::Router;
use axum::body::Bytes;
use axum::extract::{Query, State};
use axum::http::{HeaderMap, HeaderValue, StatusCode, header};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use rusqlite::{Connection, params_from_iter};
use serde_json::{Value, json};
use std::collections::{BTreeSet, HashMap};
use std::sync::{Arc, LazyLock};

const LIMIT: i64 = 10;

/// `api.py`'s `STOPWORDS`, verbatim.
static STOPWORDS: LazyLock<BTreeSet<&'static str>> = LazyLock::new(|| {
    [
        "dan", "di", "yang", "dari", "dalam", "dengan", "atau", "ini", "itu", "ke", "de", "si",
        "the", "and", "of", "in", "to", "a", "is", "are", "untuk", "oleh", "pada", "juga", "serta",
        "bagi", "akan", "dapat", "tidak", "ada", "satu", "dua", "tiga",
    ]
    .into_iter()
    .collect()
});

pub fn routes() -> Router<Arc<AppState>> {
    Router::new().route("/api/webhook/check", get(check).post(check_post))
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

fn error(status: StatusCode, message: &str) -> Response {
    json_response(status, json!({ "error": message }))
}

/// `sanitize_for_xml` is unused by the check route; `normalize_title` is: `[^\w\s]` dropped, spaces collapsed, lower.
fn normalize_title(text: &str) -> String {
    static DROP: LazyLock<regex::Regex> =
        LazyLock::new(|| regex::Regex::new(r"[^\w\s]").expect("pattern"));
    static SPACES: LazyLock<regex::Regex> =
        LazyLock::new(|| regex::Regex::new(r"\s+").expect("pattern"));
    SPACES
        .replace_all(&DROP.replace_all(text, ""), " ")
        .trim()
        .to_lowercase()
}

/// The words that narrow a title search: `[^\w\s.]` becomes a space, then the length and stopword rules.
pub fn title_words(title: &str) -> Vec<String> {
    static CLEAN: LazyLock<regex::Regex> =
        LazyLock::new(|| regex::Regex::new(r"[^\w\s.]").expect("pattern"));
    CLEAN
        .replace_all(title, " ")
        .split_whitespace()
        .filter(|word| {
            let digits = word.chars().filter(|c| *c != '.').all(char::is_numeric)
                || word.chars().all(char::is_numeric);
            (word.chars().count() > 2 || digits)
                && !STOPWORDS.contains(word.to_lowercase().as_str())
        })
        .map(str::to_owned)
        .collect()
}

/// `_normalize_format_filter`: `epub`, `.pdf`, `epub,pdf`, `epub|pdf` all become upper-case format codes.
pub fn wanted_formats(value: Option<&Value>) -> BTreeSet<String> {
    let Some(value) = value else {
        return BTreeSet::new();
    };
    let text = match value {
        Value::String(text) => text.clone(),
        Value::Array(items) => items
            .iter()
            .filter_map(Value::as_str)
            .collect::<Vec<_>>()
            .join(","),
        _ => value.to_string(),
    };
    text.split([',', '/', '|', ';'])
        .map(|part| part.trim().trim_start_matches('.').to_uppercase())
        .filter(|part| !part.is_empty())
        .collect()
}

struct Search {
    title: Option<String>,
    author: Option<String>,
    formats: BTreeSet<String>,
}

fn read_input(method: &str, query: &HashMap<String, String>, body: &[u8]) -> Search {
    if method == "POST"
        && let Ok(Value::Object(map)) = serde_json::from_slice::<Value>(body)
    {
        let text = |key: &str| map.get(key).and_then(Value::as_str).map(str::to_owned);
        return Search {
            title: text("title"),
            author: text("author"),
            formats: wanted_formats(map.get("format")),
        };
    }
    let formats = query.get("format").map_or_else(BTreeSet::new, |value| {
        wanted_formats(Some(&Value::String(value.clone())))
    });
    Search {
        title: query.get("title").cloned(),
        author: query.get("author").cloned(),
        formats,
    }
}

fn iso_timestamp(stored: &str) -> String {
    // 'YYYY-MM-DD HH:MM:SS[.ffffff]' -> Python's `datetime.isoformat()`.
    stored.replacen(' ', "T", 1)
}

/// Book ids that share a duplicate key with another book, from the index the last scan wrote (`get_duplicate_book_ids`).
fn duplicate_ids(conn: &Connection, books: &[i64]) -> rusqlite::Result<BTreeSet<i64>> {
    let enabled: bool = conn
        .query_row(
            "SELECT COALESCE(detection_enabled, 1) FROM duplicate_settings WHERE id = 1",
            [],
            |row| row.get::<_, i64>(0),
        )
        .map(|flag| flag != 0)
        .unwrap_or(false);
    if !enabled || books.is_empty() {
        return Ok(BTreeSet::new());
    }
    let fingerprint: Option<String> = conn
        .query_row(
            "SELECT criteria_fingerprint FROM duplicate_index_cache WHERE id = 1",
            [],
            |row| row.get(0),
        )
        .ok()
        .flatten();
    let Some(fingerprint) = fingerprint else {
        return Ok(BTreeSet::new());
    };
    let marks = vec!["?"; books.len()].join(",");
    let sql = format!(
        "SELECT k.book_id FROM duplicate_book_key k \
         WHERE k.criteria_fingerprint = ?1 AND k.duplicate_key IN ( \
            SELECT duplicate_key FROM duplicate_book_key \
            WHERE criteria_fingerprint = ?1 AND book_id IN ({marks}) GROUP BY duplicate_key)"
    );
    let mut args: Vec<String> = vec![fingerprint];
    args.extend(books.iter().map(i64::to_string));
    let mut statement = conn.prepare(&sql)?;
    let ids = statement
        .query_map(params_from_iter(args.iter()), |row| row.get(0))?
        .collect::<rusqlite::Result<BTreeSet<i64>>>()?;
    Ok(ids)
}

fn found_books(conn: &Connection, search: &Search) -> rusqlite::Result<(Vec<i64>, bool)> {
    let words = search.title.as_deref().map(title_words).unwrap_or_default();
    let partial = search.title.is_some() && words.is_empty();
    if search.title.is_none() && search.author.is_none() {
        return Ok((Vec::new(), partial));
    }
    let mut filters: Vec<String> = Vec::new();
    let mut args: Vec<String> = Vec::new();
    for word in &words {
        filters.push("lower(b.title) LIKE lower(?)".to_owned());
        args.push(format!("%{word}%"));
    }
    if let Some(author) = search.author.as_deref() {
        // `Books.authors.any(...)`: one author whose name OR sort matches.
        filters.push(
            "b.id IN (SELECT l.book FROM books_authors_link l JOIN authors a ON a.id = l.author \
             WHERE lower(a.name) LIKE lower(?) OR lower(a.sort) LIKE lower(?))"
                .to_owned(),
        );
        args.push(format!("%{author}%"));
        args.push(format!("%{author}%"));
    }
    let where_clause = if filters.is_empty() {
        "1".to_owned()
    } else {
        filters.join(" AND ")
    };
    let sql = format!("SELECT b.id FROM books b WHERE {where_clause} ORDER BY b.id LIMIT {LIMIT}");
    let mut statement = conn.prepare(&sql)?;
    let ids = statement
        .query_map(params_from_iter(args.iter()), |row| row.get(0))?
        .collect::<rusqlite::Result<Vec<i64>>>()?;
    Ok((ids, partial))
}

fn names_for(conn: &Connection, sql: &str, id: i64) -> rusqlite::Result<Vec<String>> {
    let mut statement = conn.prepare(sql)?;
    let rows = statement.query_map([id], |row| row.get::<_, String>(0))?;
    rows.collect()
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

async fn answer(state: Arc<AppState>, headers: HeaderMap, search: Search) -> Response {
    let Ok(settings) = state.settings().await else {
        return error(StatusCode::INTERNAL_SERVER_ERROR, "Settings unavailable");
    };
    // Flask only asks that someone is signed in (`current_user.is_authenticated`); upload rights gate the upload.
    let Ok(session::Who::User(access)) = session::identify(&state, &settings, &headers).await
    else {
        return error(StatusCode::UNAUTHORIZED, "Authentication required");
    };
    let _ = access;
    if search.title.is_none() && search.author.is_none() {
        return error(
            StatusCode::BAD_REQUEST,
            "At least one of 'title' or 'author' is required",
        );
    }
    let (app_db, metadata) = (state.app_db.clone(), settings.metadata_db());
    let result = tokio::task::spawn_blocking(move || -> rusqlite::Result<Value> {
        let conn = settings::open_read_only(&metadata)?;
        let (ids, partial) = found_books(&conn, &search)?;
        let duplicates = duplicate_ids(&conn, &ids)?;
        let wanted = search.formats.clone();
        let mut results = Vec::new();
        let mut exact_match = false;
        let mut any_duplicate = false;
        for id in &ids {
            let (title, timestamp): (String, Option<String>) = conn.query_row(
                "SELECT title, timestamp FROM books WHERE id = ?1",
                [id],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )?;
            let exact = search
                .title
                .as_deref()
                .is_some_and(|asked| normalize_title(asked) == normalize_title(&title));
            exact_match |= exact;
            let duplicate = duplicates.contains(id);
            any_duplicate |= duplicate;
            let formats: Vec<String> = names_for(&conn, "SELECT format FROM data WHERE book = ?1 ORDER BY format", *id)?
                .into_iter()
                .filter(|format| !format.is_empty())
                .collect();
            let languages = names_for(
                &conn,
                "SELECT g.lang_code FROM books_languages_link l JOIN languages g ON g.id = l.lang_code WHERE l.book = ?1 ORDER BY g.id",
                *id,
            )?;
            let series = names_for(
                &conn,
                "SELECT s.name FROM books_series_link l JOIN series s ON s.id = l.series WHERE l.book = ?1 ORDER BY s.id",
                *id,
            )?;
            let publishers = names_for(
                &conn,
                "SELECT p.name FROM books_publishers_link l JOIN publishers p ON p.id = l.publisher WHERE l.book = ?1 ORDER BY p.id",
                *id,
            )?;
            // Flask serialises `book.authors` as stored, `|` included (the bot compares against its own metadata).
            let authors = names_for(
                &conn,
                "SELECT a.name FROM books_authors_link l JOIN authors a ON a.id = l.author WHERE l.book = ?1 ORDER BY a.id",
                *id,
            )?;
            let present: BTreeSet<&str> = formats.iter().map(String::as_str).collect();
            let mut entry = json!({
                "book_id": id,
                "title": title,
                "authors": authors,
                "url": url_for(&headers, *id),
                "exact_match": exact,
                "is_duplicate": duplicate,
                "formats": formats,
                "has_format": if wanted.is_empty() { Value::Null } else { Value::Bool(wanted.iter().any(|want| present.contains(want.as_str()))) },
                "languages": languages,
                "series": series,
                "publishers": publishers,
                "timestamp": timestamp.as_deref().map(iso_timestamp),
            });
            if !wanted.is_empty() {
                let missing: Vec<&String> = wanted
                    .iter()
                    .filter(|want| !present.contains(want.as_str()))
                    .collect();
                entry["missing_formats"] = json!(missing);
            }
            results.push(entry);
        }
        let _ = app_db;
        Ok(json!({
            "found": !results.is_empty(),
            "exact_match": exact_match,
            "is_duplicate": any_duplicate,
            "count": results.len(),
            "partial": partial,
            "results": results,
        }))
    })
    .await;
    match result {
        Ok(Ok(body)) => json_response(StatusCode::OK, body),
        Ok(Err(cause)) => {
            tracing::error!("webhook check failed: {cause}");
            error(StatusCode::INTERNAL_SERVER_ERROR, &cause.to_string())
        }
        Err(cause) => {
            tracing::error!("webhook check task failed: {cause}");
            error(StatusCode::INTERNAL_SERVER_ERROR, "error")
        }
    }
}

async fn check(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Query(query): Query<HashMap<String, String>>,
) -> Response {
    let search = read_input("GET", &query, &[]);
    answer(state, headers, search).await
}

async fn check_post(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let search = read_input("POST", &HashMap::new(), &body);
    answer(state, headers, search).await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn title_words_drop_short_words_and_stopwords() {
        assert_eq!(
            title_words("The Zine Fair 2013"),
            vec!["Zine", "Fair", "2013"]
        );
        assert_eq!(title_words("Zine vol"), vec!["Zine", "vol"]);
        assert!(title_words("???").is_empty());
        assert_eq!(
            title_words("Scream @ Word!"),
            vec!["Scream", "Word"],
            "punctuation separates words"
        );
        assert!(title_words("dan di yang").is_empty(), "all stopwords");
        assert_eq!(title_words("of the book"), vec!["book"]);
        assert_eq!(title_words("1.2"), vec!["1.2"], "a dotted number survives");
    }

    #[test]
    fn normalize_title_matches_flasks_rules() {
        assert_eq!(normalize_title("Zine Vol. 2!"), "zine vol 2");
        assert_eq!(normalize_title("  Café   Müller "), "café müller");
    }

    #[test]
    fn format_filters_accept_the_shapes_the_bot_sends() {
        let set = |v: Value| wanted_formats(Some(&v));
        assert_eq!(
            set(json!("epub,pdf")),
            ["EPUB", "PDF"].map(String::from).into_iter().collect()
        );
        assert_eq!(
            set(json!(".pdf")),
            ["PDF"].map(String::from).into_iter().collect()
        );
        assert_eq!(
            set(json!("epub|pdf")),
            ["EPUB", "PDF"].map(String::from).into_iter().collect()
        );
        assert!(set(json!("")).is_empty());
        assert_eq!(set(json!(["epub", "pdf"])).len(), 2);
    }
}
