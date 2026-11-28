//! The legacy numeric URLs of the main host: `/book/<id>[/...]` and `/author/<id>[/<page>]`. Flask answers them with a
//! `301` to the canonical slug page; Rust does the same lookup for the visitor who sent no cookie or credential.
//!
//! * Book (`web.show_book`, `web.redirect_book_slug`): `book-slugs.json` maps id to slug (the file `seed.mjs` writes and
//!   Flask re-reads when its mtime changes). A known id answers `/book/<slug>/`; the `/book/<id>/<anything>[/<extra>]`
//!   aliases answer `/book/<id>/`. An id missing from the map is Flask's HTML 404 page, so it is proxied.
//! * Author (`web.redirect_author_slug`): the slug is computed from the author's name, with a `-<id>` suffix when two
//!   names collapse to the same slug (`_author_slug` in `cps/web.py`, reproduced here including its transliterations).
//!
//! Everything else goes to Flask unchanged: a request with a cookie or `Authorization` (Flask may refresh its session),
//! reverse-proxy login, a library that needs a login for `show_book`, the legacy host (which renders the real page), a
//! percent-encoded or oddly shaped path, an unknown book or author, and every method but GET and HEAD.

use crate::{AppState, download, proxy};
use axum::Router;
use axum::body::Body;
use axum::extract::{OriginalUri, Path as AxPath, State};
use axum::http::{HeaderMap, HeaderValue, Method, StatusCode, header};
use axum::response::{IntoResponse, Response};
use axum::routing::any;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use unicode_normalization::UnicodeNormalization;
use unicode_normalization::char::canonical_combining_class;

/// The parsed map and the mtime (ns) of the file it came from.
pub type SlugCache = (u128, Arc<HashMap<i64, String>>);

const BOOK_SLUGS_FILE: &str = "book-slugs.json";
const MAX_BASE_LENGTH: usize = 96;

pub fn routes() -> Router<Arc<AppState>> {
    // Wildcards, so a shape Flask does not route (and Rust does not parse) is proxied instead of becoming a bare 404.
    Router::new()
        .route("/book/{*rest}", any(book))
        .route("/author/{*rest}", any(author))
}

/// `request.host.split(":")[0] == "old-pustaka.taratsa.id"` renders the whole book page in Flask. Matched loosely: any
/// host naming the legacy site goes to Flask.
fn legacy_host(headers: &HeaderMap) -> bool {
    headers
        .get(header::HOST)
        .and_then(|v| v.to_str().ok())
        .is_none_or(|host| host.to_ascii_lowercase().contains("old-pustaka"))
}

fn has_identity(headers: &HeaderMap) -> bool {
    headers.contains_key(header::COOKIE) || headers.contains_key(header::AUTHORIZATION)
}

fn digits(text: &str) -> Option<i64> {
    if text.is_empty() || !text.bytes().all(|b| b.is_ascii_digit()) {
        return None;
    }
    text.parse().ok()
}

#[derive(Debug, PartialEq, Eq)]
enum BookShape {
    /// `/book/<id>` and `/book/<id>/`: `show_book`, a lookup in the slug map.
    Show(i64),
    /// `/book/<id>/<slug>`, `/book/<id>/<slug>/`, `/book/<id>/<slug>/<extra>`: `redirect_book_slug`.
    Alias(i64),
}

/// The three route families of `web.py`. A trailing slash is allowed after the id and after the slug only, exactly like
/// the werkzeug rules; `%` anywhere means the server would have decoded it before routing, so it is not parsed here.
fn book_shape(rest: &str) -> Option<BookShape> {
    if rest.contains('%') {
        return None;
    }
    let parts: Vec<&str> = rest.split('/').collect();
    match parts.as_slice() {
        [id] | [id, ""] => digits(id).map(BookShape::Show),
        [id, slug] | [id, slug, ""] if !slug.is_empty() => digits(id).map(BookShape::Alias),
        [id, slug, extra] if !slug.is_empty() && !extra.is_empty() => {
            digits(id).map(BookShape::Alias)
        }
        _ => None,
    }
}

async fn book(
    State(state): State<Arc<AppState>>,
    uri: OriginalUri,
    method: Method,
    headers: HeaderMap,
) -> Response {
    let path_and_query = uri
        .0
        .path_and_query()
        .map_or_else(|| uri.0.path().to_owned(), |v| v.as_str().to_owned());
    let to_flask = |state, method, headers| {
        proxy::fallback_reconstructed(state, &path_and_query, method, headers)
    };
    let shape = uri
        .0
        .path()
        .strip_prefix("/book/")
        .and_then(book_shape)
        .filter(|_| matches!(method, Method::GET | Method::HEAD))
        .filter(|_| !has_identity(&headers) && !legacy_host(&headers));
    let Some(shape) = shape else {
        return to_flask(state, method, headers).await;
    };
    match shape {
        BookShape::Alias(id) => redirect(&format!("/book/{id}/")),
        BookShape::Show(id) => {
            // `login_required_if_no_ano`: a library that needs a login is Flask's to answer.
            let open = state
                .settings()
                .await
                .is_ok_and(|s| s.anonymous_browse && !s.reverse_proxy_login);
            match open.then(|| state.book_slug(id)).flatten() {
                Some(slug) => redirect(&format!("/book/{slug}/")),
                None => to_flask(state, method, headers).await,
            }
        }
    }
}

/// `/author/<id>`, `/author/<id>/`, `/author/<id>/<page>[/]`, `/author/<id>/page/<page>[/]`.
fn author_shape(rest: &str) -> Option<(i64, i64)> {
    if rest.contains('%') {
        return None;
    }
    let parts: Vec<&str> = rest.split('/').collect();
    match parts.as_slice() {
        [id] | [id, ""] => Some((digits(id)?, 1)),
        [id, page] | [id, page, ""] if *page != "page" => Some((digits(id)?, digits(page)?)),
        ["page", ..] => None,
        [id, "page", page] | [id, "page", page, ""] => Some((digits(id)?, digits(page)?)),
        _ => None,
    }
}

async fn author(
    State(state): State<Arc<AppState>>,
    AxPath(_rest): AxPath<String>,
    uri: OriginalUri,
    method: Method,
    headers: HeaderMap,
) -> Response {
    let path_and_query = uri
        .0
        .path_and_query()
        .map_or_else(|| uri.0.path().to_owned(), |v| v.as_str().to_owned());
    let parsed = uri
        .0
        .path()
        .strip_prefix("/author/")
        .and_then(author_shape)
        .filter(|_| matches!(method, Method::GET | Method::HEAD))
        .filter(|_| !has_identity(&headers));
    let answer = match (parsed, state.settings().await) {
        (Some((id, page)), Ok(settings)) if !settings.reverse_proxy_login => {
            let metadata = settings.metadata_db();
            tokio::task::spawn_blocking(move || slug_for_author(&metadata, id))
                .await
                .ok()
                .and_then(Result::ok)
                .flatten()
                .map(|slug| (slug, page))
        }
        _ => None,
    };
    match answer {
        Some((slug, page)) if page > 1 => redirect(&format!("/author/{slug}/page/{page}/")),
        Some((slug, _)) => redirect(&format!("/author/{slug}/")),
        None => proxy::fallback_reconstructed(state, &path_and_query, method, headers).await,
    }
}

/// werkzeug's `redirect(location, 301)`: body, headers and the `Vary: Cookie` Flask's session adds. No `Cache-Control`.
fn redirect(location: &str) -> Response {
    let html = download::escape_html(location);
    let body = format!(
        "<!doctype html>\n<html lang=en>\n<title>Redirecting...</title>\n<h1>Redirecting...</h1>\n\
         <p>You should be redirected automatically to the target URL: <a href=\"{html}\">{html}</a>. \
         If not, click the link.\n"
    );
    let mut response = (StatusCode::MOVED_PERMANENTLY, Body::from(body)).into_response();
    let headers = response.headers_mut();
    headers.insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("text/html; charset=utf-8"),
    );
    if let Ok(value) = HeaderValue::from_str(location) {
        headers.insert(header::LOCATION, value);
    }
    headers.insert(header::VARY, HeaderValue::from_static("Cookie"));
    response
}

// ---- the book slug map ------------------------------------------------------------------------------------------

/// `_BOOK_SLUG_PATTERN`: `[a-z0-9]+(?:-[a-z0-9]+)*`.
fn valid_slug(slug: &str) -> bool {
    !slug.is_empty()
        && slug.split('-').all(|part| {
            !part.is_empty()
                && part
                    .bytes()
                    .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit())
        })
}

fn load_slug_map(path: &Path) -> Option<HashMap<i64, String>> {
    let payload: serde_json::Value = serde_json::from_slice(&std::fs::read(path).ok()?).ok()?;
    let entries = payload.as_object()?;
    Some(
        entries
            .iter()
            .filter_map(|(id, slug)| {
                let slug = slug.as_str().filter(|s| valid_slug(s))?;
                Some((digits(id)?, slug.to_owned()))
            })
            .collect(),
    )
}

impl AppState {
    /// `_book_slug_map_path`: `BOOK_SLUGS_PATH` first, then the copies Flask also looks for.
    fn book_slugs_file(&self) -> Option<PathBuf> {
        let project_root = self.static_directory.parent().and_then(Path::parent);
        let beside_app_db = self.app_db.parent().map(|dir| dir.join(BOOK_SLUGS_FILE));
        [
            self.book_slugs_path.clone(),
            project_root.map(|root| root.join(BOOK_SLUGS_FILE)),
            project_root.map(|root| root.join("frontend/src/data").join(BOOK_SLUGS_FILE)),
            beside_app_db,
        ]
        .into_iter()
        .flatten()
        .find(|path| path.is_file())
    }

    /// Slug of a book, re-reading the file when its mtime changed (like `_get_book_slugs`). `None` for an id that is
    /// not in the map and when the map cannot be read: both are Flask's to answer.
    fn book_slug(&self, id: i64) -> Option<String> {
        let path = self.book_slugs_file()?;
        let mtime = std::fs::metadata(&path)
            .ok()?
            .modified()
            .ok()?
            .duration_since(std::time::UNIX_EPOCH)
            .ok()?
            .as_nanos();
        let mut cache = self.book_slugs.lock().ok()?;
        if cache.as_ref().is_none_or(|(at, _)| *at != mtime) {
            *cache = Some((mtime, Arc::new(load_slug_map(&path)?)));
        }
        cache.as_ref()?.1.get(&id).cloned()
    }
}

// ---- the author slug ----------------------------------------------------------------------------------------------

/// `_author_slug_base`: NFKD, drop combining marks, lower-case, transliterate a few letters NFKD leaves alone, then
/// every run of anything but `[a-z0-9]` becomes one hyphen.
fn author_slug_base(name: &str) -> String {
    let mut value: String = name
        .nfkd()
        .filter(|c| canonical_combining_class(*c) == 0)
        .collect::<String>()
        .to_lowercase();
    for (from, to) in [
        ("ı", "i"),
        ("ł", "l"),
        ("đ", "d"),
        ("ð", "d"),
        ("þ", "th"),
        ("ß", "ss"),
        ("æ", "ae"),
        ("œ", "oe"),
        ("ø", "o"),
        ("ħ", "h"),
        ("ŋ", "n"),
        ("ƒ", "f"),
        ("ə", "e"),
    ] {
        value = value.replace(from, to);
    }
    let mut out = String::with_capacity(value.len());
    let mut pending_hyphen = false;
    for c in value.chars() {
        if c.is_ascii_lowercase() || c.is_ascii_digit() {
            if pending_hyphen && !out.is_empty() {
                out.push('-');
            }
            pending_hyphen = false;
            out.push(c);
        } else {
            pending_hyphen = true;
        }
    }
    if out.is_empty() { "author".into() } else { out }
}

fn slug_name(name: &str) -> String {
    author_slug_base(name.replace('|', ", ").trim())
}

/// `base[:96].rstrip("-") or "author"`; `base` is ASCII here.
fn shortened(base: &str) -> String {
    let cut = &base[..base.len().min(MAX_BASE_LENGTH)];
    let cut = cut.trim_end_matches('-');
    if cut.is_empty() {
        "author".into()
    } else {
        cut.into()
    }
}

/// `_author_slug(author, authors)` for the author `target` among `authors` (id, name).
fn author_slug(target: i64, authors: &[(i64, String)]) -> Option<String> {
    let base = slug_name(&authors.iter().find(|(id, _)| *id == target)?.1);
    let short = shortened(&base);
    let collision = authors.iter().any(|(id, name)| {
        *id != target && {
            let other = slug_name(name);
            other == base || shortened(&other) == short
        }
    });
    if !(base.bytes().all(|b| b.is_ascii_digit()) || collision || base.len() > MAX_BASE_LENGTH) {
        return Some(short);
    }
    let suffix = format!("-{target}");
    let room = MAX_BASE_LENGTH.saturating_sub(suffix.len());
    let head = &short[..short.len().min(room)];
    Some(format!("{}{suffix}", head.trim_end_matches('-')))
}

fn slug_for_author(metadata_db: &Path, id: i64) -> rusqlite::Result<Option<String>> {
    let conn = crate::settings::open_read_only(metadata_db)?;
    let mut statement = conn.prepare("SELECT id, name FROM authors")?;
    let authors: Vec<(i64, String)> = statement
        .query_map([], |row| {
            Ok((
                row.get(0)?,
                row.get::<_, Option<String>>(1)?.unwrap_or_default(),
            ))
        })?
        .collect::<Result<_, _>>()?;
    Ok(author_slug(id, &authors))
}

#[cfg(test)]
mod tests {
    use super::*;

    // Outputs of `_author_slug_base` in the live app image (Python 3.15 `unicodedata`).
    #[test]
    fn slug_base_matches_flask() {
        for (name, expected) in [
            ("Café Müller", "cafe-muller"),
            ("Đorđe Łukasiewicz", "dorde-lukasiewicz"),
            ("Straße", "strasse"),
            ("İstanbul", "istanbul"),
            ("Ｗｉｌｌ ² ﬁ ™", "will-2-fi-tm"),
            ("شعر عربي", "author"),
            ("北京", "author"),
            ("  --A__B..C  ", "a-b-c"),
            ("Ælfred Ørsted Þór", "aelfred-orsted-thor"),
            ("ẞ", "ss"),
            ("Kelvin K", "kelvin-k"),
            ("1234", "1234"),
            ("12-34", "12-34"),
            ("Ça va, ǅ", "ca-va-dz"),
        ] {
            assert_eq!(author_slug_base(name), expected, "{name}");
        }
    }

    #[test]
    fn collisions_digits_and_long_names_get_the_id() {
        let authors = vec![
            (1, "Ann Lee".to_owned()),
            (2, "ann  lee".to_owned()),
            (3, "1999".to_owned()),
            (4, "x".repeat(120)),
            (5, "Solo".to_owned()),
            (6, "Smith|John".to_owned()),
        ];
        assert_eq!(author_slug(1, &authors).unwrap(), "ann-lee-1");
        assert_eq!(author_slug(2, &authors).unwrap(), "ann-lee-2");
        assert_eq!(author_slug(3, &authors).unwrap(), "1999-3");
        assert_eq!(author_slug(5, &authors).unwrap(), "solo");
        assert_eq!(author_slug(6, &authors).unwrap(), "smith-john");
        let long = author_slug(4, &authors).unwrap();
        assert_eq!(long.len(), 96);
        assert!(long.ends_with("-4"));
        assert_eq!(author_slug(99, &authors), None);
    }

    #[test]
    fn route_shapes_follow_the_werkzeug_rules() {
        assert_eq!(book_shape("22695"), Some(BookShape::Show(22695)));
        assert_eq!(book_shape("22695/"), Some(BookShape::Show(22695)));
        assert_eq!(book_shape("0022695"), Some(BookShape::Show(22695)));
        assert_eq!(book_shape("22695/s"), Some(BookShape::Alias(22695)));
        assert_eq!(book_shape("22695/s/"), Some(BookShape::Alias(22695)));
        assert_eq!(book_shape("22695/s/e"), Some(BookShape::Alias(22695)));
        for odd in [
            "22695/s/e/",
            "22695//",
            "22695/s//",
            "x",
            "",
            "1/%2F",
            "-1",
            "1/s/e/f",
        ] {
            assert_eq!(book_shape(odd), None, "{odd:?}");
        }
        assert_eq!(author_shape("1"), Some((1, 1)));
        assert_eq!(author_shape("1/"), Some((1, 1)));
        assert_eq!(author_shape("1/2"), Some((1, 2)));
        assert_eq!(author_shape("1/02/"), Some((1, 2)));
        assert_eq!(author_shape("1/page/3"), Some((1, 3)));
        assert_eq!(author_shape("1/page/3/"), Some((1, 3)));
        for odd in [
            "1/page", "1/page/", "page/3", "1/x", "1/2/3", "1/page/x", "1//",
        ] {
            assert_eq!(author_shape(odd), None, "{odd:?}");
        }
    }

    #[test]
    fn a_slug_must_match_flasks_pattern() {
        assert!(valid_slug("a-b-1"));
        for bad in ["", "-a", "a-", "a--b", "A", "a_b", "a b"] {
            assert!(!valid_slug(bad), "{bad:?}");
        }
    }
}
