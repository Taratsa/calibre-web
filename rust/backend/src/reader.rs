//! The guest-accessible PDF viewer shell (`GET /read/<id>/pdf`). A request that carries any cookie or credential
//! stays on Flask: the session holds revocable identity, per-user archive state and the permissions PDF.js renders
//! into its toolbar. Rust renders only the page Flask would give an anonymous visitor when guest browsing is on.

use crate::{AppState, library, locale, proxy, signing};
use axum::Router;
use axum::extract::{OriginalUri, Path, State};
use axum::http::{HeaderMap, HeaderName, HeaderValue, Method, StatusCode, header};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use std::sync::Arc;

const ROLE_DOWNLOAD: i64 = 1 << 1;
const ROLE_VIEWER: i64 = 1 << 8;

const TEMPLATE: &str = include_str!("../../../cps/templates/readpdf.html");
const GOOGLE_BLOCK: &str = "    {% if g.google_site_verification|length > 0 %}\n      <meta name=\"google-site-verification\" content=\"{{g.google_site_verification}}\">\n    {% endif %}\n";
// no trailing newline: the template's own newline after the include stays
const UMAMI_BLOCK: &str = "    {% set umami_event = 'pdf-read' %}{% set umami_book_id = pdffile %}{% set umami_format = 'pdf' %}\n    {% include 'umami_reader.html' %}";
const DOWNLOAD_OPEN: &str = "{% if current_user.role_download() %}\n";
const DOWNLOAD_CLOSE: &str = "{% endif %}\n";

pub fn routes() -> Router<Arc<AppState>> {
    // Every `/read/<id>/<format>` and its trailing-slash/unknown shapes reach one handler, which answers only the exact
    // guest PDF page and proxies the rest unchanged, so the route table here cannot make a Flask URL a bare 404.
    Router::new()
        .route("/read/{book_id}/{format}", get(pdf_reader))
        .route("/read/{book_id}/{format}/", get(pdf_reader))
}

async fn pdf_reader(
    State(state): State<Arc<AppState>>,
    Path((book_id, format)): Path<(String, String)>,
    uri: OriginalUri,
    method: Method,
    headers: HeaderMap,
) -> Response {
    let path = uri
        .0
        .path_and_query()
        .map_or_else(|| uri.0.path().to_owned(), |v| v.as_str().to_owned());
    // Flask's `<int:book_id>` converter accepts only ASCII digits, and the format is matched exactly (`pdf`).
    let plain_digits = !book_id.is_empty() && book_id.bytes().all(|b| b.is_ascii_digit());
    let book_id = match book_id.parse::<i64>() {
        Ok(id) if plain_digits && format == "pdf" && !uri.0.path().ends_with('/') => id,
        _ => return proxy::fallback_reconstructed(state, &path, method, headers).await,
    };
    let settings = match state.settings().await {
        Ok(settings) => settings,
        Err(error) => {
            tracing::error!("PDF reader settings unavailable: {error}");
            return proxy::fallback_reconstructed(state, &path, method, headers).await;
        }
    };

    // Identity, reverse-proxy login, custom-column ACLs and Google Drive stay in Flask.
    if headers.contains_key(header::COOKIE)
        || headers.contains_key(header::AUTHORIZATION)
        || settings.reverse_proxy_login
        || settings.restricted_column != 0
        || settings.use_google_drive
        || !settings.anonymous_browse
    {
        return proxy::fallback_reconstructed(state, &path, method, headers).await;
    }

    // The guest's role and filters decide what this page may show, so they are read fresh, not from the 1 s cache.
    let app_db = state.app_db.clone();
    let guest =
        tokio::task::spawn_blocking(move || crate::settings::load_guest_access(&app_db)).await;
    let guest = match guest {
        Ok(Ok(guest)) => guest,
        Ok(Err(error)) => {
            tracing::error!("PDF reader guest settings unavailable: {error}");
            return proxy::fallback_reconstructed(state, &path, method, headers).await;
        }
        Err(error) => {
            tracing::error!("PDF reader guest settings task failed: {error}");
            return proxy::fallback_reconstructed(state, &path, method, headers).await;
        }
    };
    // `get_filtered_book` also hides the guest's archived books, which the query below does not model.
    if guest.role & ROLE_VIEWER == 0 || guest.has_archived {
        return proxy::fallback_reconstructed(state, &path, method, headers).await;
    }
    let guest_role = guest.role;

    let metadata_db = settings.metadata_db();
    let found = tokio::task::spawn_blocking(move || {
        library::find_visible_pdf_reader_book(
            &metadata_db,
            book_id,
            &guest.language,
            &guest.denied,
            &guest.allowed,
        )
    })
    .await;
    // A hidden or missing book is a flash message and a redirect in Flask, and so is any database error here.
    let book = match found {
        Ok(Ok(Some(book))) => book,
        Ok(Ok(None)) | Ok(Err(_)) | Err(_) => {
            return proxy::fallback_reconstructed(state, &path, method, headers).await;
        }
    };

    let pdf_url = match (
        book.pdf_size,
        signing::version(book.last_modified.as_deref(), book.pdf_size),
    ) {
        (Some(_), Ok(version)) => {
            let signature = signing::signature(&state.secret(&settings), book_id, "pdf", &version);
            format!("/files/{book_id}/pdf/{version}/{signature}")
        }
        // No PDF format: Flask points the viewer at `/show`, whose own 404 the reader then shows.
        _ => format!("/show/{book_id}/pdf"),
    };
    let Some(label) = locale::pdf_reader_label(
        headers
            .get(header::ACCEPT_LANGUAGE)
            .and_then(|value| value.to_str().ok()),
    ) else {
        // A header shape the generated table cannot answer exactly: let Flask choose the translation.
        return proxy::fallback_reconstructed(state, &path, method, headers).await;
    };
    // Jinja (no trim_blocks) keeps the whitespace around a block tag: the tag becomes empty but its indentation and
    // newline stay. A false `if` leaves the text before the tag and the newline after `endif`.
    let verification = std::env::var("GOOGLE_SITE_VERIFICATION").unwrap_or_default();
    let verification = if verification.is_empty() {
        "    \n".to_owned()
    } else {
        format!(
            "    \n      <meta name=\"google-site-verification\" content=\"{}\">\n    \n",
            escape_html(&verification)
        )
    };

    let mut page = TEMPLATE
        .replace(GOOGLE_BLOCK, &verification)
        .replace("{{_('PDF Reader')}}", &escape_html(label))
        .replace("{{title}}", &escape_html(&book.title))
        .replace("{{ pdf_url }}", &pdf_url)
        .replace(UMAMI_BLOCK, &umami_script(book_id, &book.title));
    page = replace_static_urls(page);
    page = if guest_role & ROLE_DOWNLOAD != 0 {
        // the open and close tag lines are empty lines
        page.replace(DOWNLOAD_OPEN, "\n")
            .replace(DOWNLOAD_CLOSE, "\n")
    } else {
        remove_blocks(&page, DOWNLOAD_OPEN, DOWNLOAD_CLOSE, "\n")
    };
    if page.contains("{{") || page.contains("{%") {
        tracing::error!("unresolved Jinja markup in the PDF reader template");
        return proxy::fallback_reconstructed(state, &path, method, headers).await;
    }

    let mut response = (StatusCode::OK, page).into_response();
    response.headers_mut().insert(
        HeaderName::from_static(crate::security::READER_PAGE),
        HeaderValue::from_static("1"),
    );
    let out = response.headers_mut();
    out.insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("text/html; charset=utf-8"),
    );
    out.insert(header::VARY, HeaderValue::from_static("Cookie"));
    out.insert(
        HeaderName::from_static("x-robots-tag"),
        HeaderValue::from_static("noindex"),
    );
    response
}

/// `url_for('static', filename=...)` for the fixed set of assets the template names.
fn replace_static_urls(page: String) -> String {
    let mut page = page;
    for name in [
        "favicon.ico",
        "css/libs/viewer.css",
        "locale/locale.json",
        "js/libs/pdf.mjs",
        "cmaps/",
        "standard_fonts/",
        "css/images/",
        "wasm/",
        "iccs/",
        "js/libs/pdf.worker.mjs",
        "js/libs/viewer.mjs",
    ] {
        page = page.replace(
            &format!("{{{{ url_for('static', filename='{name}') }}}}"),
            &format!("/static/{name}"),
        );
    }
    page
}

/// Replaces every `opening ... closing` span (the Jinja `{% if %}` blocks whose condition is false) with
/// `replacement`: the blank line Jinja leaves where the tag lines were.
fn remove_blocks(input: &str, opening: &str, closing: &str, replacement: &str) -> String {
    let mut out = String::with_capacity(input.len());
    let mut rest = input;
    while let Some(start) = rest.find(opening) {
        out.push_str(&rest[..start]);
        let after = &rest[start + opening.len()..];
        match after.find(closing) {
            Some(end) => {
                out.push_str(replacement);
                rest = &after[end + closing.len()..];
            }
            None => return out,
        }
    }
    out.push_str(rest);
    out
}

/// `markupsafe.escape`.
fn escape_html(value: &str) -> String {
    let mut out = String::with_capacity(value.len());
    for ch in value.chars() {
        match ch {
            '&' => out.push_str("&amp;"),
            '<' => out.push_str("&lt;"),
            '>' => out.push_str("&gt;"),
            '\'' => out.push_str("&#39;"),
            '"' => out.push_str("&#34;"),
            other => out.push(other),
        }
    }
    out
}

/// `umami_reader.html` with its three `tojson` values. Jinja's `tojson` escapes `<`, `>`, `&` and `'` as `\u003c`,
/// `\u003e`, `\u0026`, `\u0027`, so the script cannot be closed from a book title.
fn umami_script(book_id: i64, title: &str) -> String {
    let title = crate::pyjson::tojson(title);
    format!(
        "    \n    \n<script defer=\"\" src=\"https://umami.kenadera.org/script.js\" data-website-id=\"0b57aeb6-d996-4d88-89fc-59ada511cd9c\" data-performance=\"true\" data-do-not-track=\"true\" type=\"text/javascript\" data-cfasync=\"false\"></script>\n<script type=\"text/javascript\" data-cfasync=\"false\">\n  window.addEventListener('load', function () {{\n    if (window.umami && typeof window.umami.track === 'function') {{\n      window.umami.track(\"pdf-read\", {{\n        book_id: {book_id},\n        format: \"pdf\",\n        title: {title}\n      }});\n    }}\n  }});\n</script>"
    )
}

#[cfg(test)]
mod tests {
    use super::remove_blocks;

    #[test]
    fn removes_only_the_marked_blocks() {
        assert_eq!(remove_blocks("a[x]b[y]c", "[", "]", ""), "abc");
        assert_eq!(remove_blocks("a[unclosed", "[", "]", ""), "a");
    }
}
