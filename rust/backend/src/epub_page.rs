//! The EPUB reader shell (`GET /read/<id>/epub`) for the anonymous visitor, a port of `cps/templates/read.html`
//! rendered by `web.read_book` for a guest.
//!
//! The public site has no reader accounts: visitors browse anonymously and only the admin logs in. This page is the
//! last Flask-served step of a public reader's path, and it is fetched mostly by crawlers. Rendering it needs one piece
//! of state Rust has so far only read: `csrf_token()` stores a value in the session, so Flask's answer carries a
//! `Set-Cookie`. This module therefore MINTS that cookie (and the `wtf-csrf-token`-salted token) exactly as Flask does,
//! reusing the signer in `session.rs`. For a guest the token is inert (`/ajax/bookmark/...` is login-only), so a
//! malformed cookie would simply make Flask replace it on the next request rather than break anything.
//!
//! Everything that is not a plain guest (a logged-in user with a bookmark and `useBookmarks`, `kepub`, a cookie that
//! does not verify, the ACL switches) stays with Flask.

use crate::reader::escape_html;
use crate::{AppState, library, pyjson, session, settings};
use axum::http::{HeaderMap, HeaderValue, StatusCode, header};
use axum::response::{IntoResponse, Response};
use std::collections::HashMap;
use std::sync::{Arc, LazyLock};

const ROLE_VIEWER: i64 = 1 << 8;
const TEMPLATE: &str = include_str!("../../../cps/templates/read.html");
const STRINGS: &str = include_str!("reader_strings.json");
const GOOGLE_BLOCK: &str = "    {% if g.google_site_verification|length > 0 %}\n    <meta name=\"google-site-verification\" content=\"{{g.google_site_verification}}\">\n    {% endif %}\n";
const UMAMI_BLOCK: &str = "    {% set umami_event = 'epub-read' %}{% set umami_book_id = bookid %}{% set umami_format = book_format|lower %}\n    {% include 'umami_reader.html' %}";

static CATALOGS: LazyLock<HashMap<String, HashMap<String, String>>> =
    LazyLock::new(|| serde_json::from_str(STRINGS).expect("reader_strings.json is generated JSON"));

/// `gettext(msgid)` for the chosen locale: the catalog's entry, else the msgid (Babel's fallback).
fn translate(locale: &str, msgid: &str) -> String {
    CATALOGS
        .get(locale)
        .and_then(|catalog| catalog.get(msgid))
        .cloned()
        .unwrap_or_else(|| msgid.to_owned())
}

/// `umami_reader.html` with its tojson values; the two blank 4-space lines are the `{% set %}` line and the include.
fn umami_script(book_id: i64, format: &str, title: &str) -> String {
    format!(
        "    \n    \n<script defer=\"\" src=\"https://umami.kenadera.org/script.js\" data-website-id=\"0b57aeb6-d996-4d88-89fc-59ada511cd9c\" data-performance=\"true\" data-do-not-track=\"true\" type=\"text/javascript\" data-cfasync=\"false\"></script>\n<script type=\"text/javascript\" data-cfasync=\"false\">\n  window.addEventListener('load', function () {{\n    if (window.umami && typeof window.umami.track === 'function') {{\n      window.umami.track({}, {{\n        book_id: {book_id},\n        format: {},\n        title: {}\n      }});\n    }}\n  }});\n</script>",
        pyjson::tojson("epub-read"),
        pyjson::tojson(format),
        pyjson::tojson(title),
    )
}

/// Render the page, or `None` when Flask must answer.
pub async fn render(
    state: &Arc<AppState>,
    book_id: i64,
    format: &str,
    headers: &HeaderMap,
) -> Option<Response> {
    if format != "epub" {
        return None;
    }
    let settings = match state.settings().await {
        Ok(settings) => settings,
        Err(error) => {
            tracing::error!("EPUB reader settings unavailable: {error}");
            return None;
        }
    };
    if headers.contains_key(header::AUTHORIZATION)
        || settings.reverse_proxy_login
        || settings.restricted_column != 0
        || settings.use_google_drive
        || !settings.anonymous_browse
    {
        return None;
    }
    // The visitor must be anonymous: a logged-in reader gets Flask's page (bookmark + useBookmarks).
    let secret = state.secret(&settings);
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .ok()?
        .as_secs();
    let csrf = match session::anonymous_csrf(headers, &secret, now) {
        Ok(csrf) => csrf,
        Err(_) => return None,
    };

    let app_db = state.app_db.clone();
    let guest = tokio::task::spawn_blocking(move || settings::load_guest_access(&app_db))
        .await
        .ok()?
        .ok()?;
    if guest.role & ROLE_VIEWER == 0 || guest.has_archived {
        return None;
    }
    let metadata_db = settings.metadata_db();
    let (language, denied, allowed) = (guest.language, guest.denied, guest.allowed);
    let title = tokio::task::spawn_blocking(move || {
        library::find_visible_title(&metadata_db, book_id, &language, &denied, &allowed)
    })
    .await
    .ok()?
    .ok()??;
    let locale = crate::locale::select(
        headers
            .get(header::ACCEPT_LANGUAGE)
            .and_then(|value| value.to_str().ok()),
    )?;

    // Flask stores the value when it is absent; it then also sends the session cookie. With one already in the
    // verified cookie, the answer carries no Set-Cookie.
    let (csrf_value, set_cookie) = match csrf {
        Some(value) => (value, None),
        None => {
            let value = session::new_csrf_value();
            let cookie = session::new_session_cookie(&secret, &value, now);
            (value, Some(cookie))
        }
    };
    let token = session::csrf_token(&secret, &csrf_value, now);
    let page = render_page(book_id, &title, locale, &token);
    if page.contains("{{") || page.contains("{%") {
        tracing::error!("unresolved Jinja markup in the EPUB reader template");
        return None;
    }
    let mut response = (StatusCode::OK, page).into_response();
    let out = response.headers_mut();
    out.insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("text/html; charset=utf-8"),
    );
    out.insert(header::VARY, HeaderValue::from_static("Cookie"));
    out.insert(
        axum::http::HeaderName::from_static("x-robots-tag"),
        HeaderValue::from_static("noindex"),
    );
    out.insert(
        axum::http::HeaderName::from_static(crate::security::READER_PAGE),
        HeaderValue::from_static("1"),
    );
    if let Some(cookie) = set_cookie {
        let value = format!("session={cookie}; HttpOnly; Path=/; SameSite=Lax");
        out.insert(header::SET_COOKIE, HeaderValue::from_str(&value).ok()?);
    }
    Some(response)
}

/// The template with every Jinja expression replaced by what Flask's render produced.
fn render_page(book_id: i64, title: &str, locale: &str, csrf: &str) -> String {
    // Jinja drops the template file's single trailing newline (`keep_trailing_newline` is off).
    let mut page = TEMPLATE.strip_suffix('\n').unwrap_or(TEMPLATE).to_owned();
    // Google verification: absent in production, then only the tag line's indentation remains.
    let verification = std::env::var("GOOGLE_SITE_VERIFICATION").unwrap_or_default();
    page = if verification.is_empty() {
        page.replace(GOOGLE_BLOCK, "    \n")
    } else {
        page.replace(
            GOOGLE_BLOCK,
            &format!(
                "    \n    <meta name=\"google-site-verification\" content=\"{}\">\n    \n",
                escape_html(&verification)
            ),
        )
    };
    page = page.replace(UMAMI_BLOCK, &umami_script(book_id, "epub", title));
    page = page.replace(
        "{{_('epub Reader')}}",
        &escape_html(&translate(locale, "epub Reader")),
    );
    page = page.replace("{{title}}", &escape_html(title));
    page = page.replace("{{ csrf_token() }}", csrf);
    page = page.replace("{{ url_for('web.index') }}", "/");
    page = page.replace(
        "{{ url_for('web.readium_manifest', book_id=bookid) | tojson }}",
        &pyjson::tojson(&format!("/show/readium/{book_id}/manifest.json")),
    );
    page = page.replace(
        "{{ url_for('web.set_bookmark', book_id=bookid, book_format=book_format) | tojson }}",
        &pyjson::tojson(&format!("/ajax/bookmark/{book_id}/epub")),
    );
    page = page.replace("{{ bookid | tojson }}", &book_id.to_string());
    page = page.replace(
        "{{ (bookmark.bookmark_key if bookmark != None else '') | tojson }}",
        "\"\"",
    );
    page = page.replace("{{ current_user.is_authenticated | tojson }}", "false");
    for msgid in ["The book could not be loaded.", "Reload"] {
        let token = format!("{{{{ _('{msgid}') | tojson }}}}");
        page = page.replace(&token, &pyjson::tojson(&translate(locale, msgid)));
    }
    // Every remaining `{{_('…')}}` / `{{ _('…') }}` label.
    for msgid in msgids() {
        let translated = escape_html(&translate(locale, &msgid));
        page = page.replace(&format!("{{{{_('{msgid}')}}}}"), &translated);
        page = page.replace(&format!("{{{{ _('{msgid}') }}}}"), &translated);
    }
    static_urls(&page)
}

/// Every `url_for('static', filename='…')` becomes `/static/…`, whatever the file (the PDF reader lists its names; here
/// the template names ten, so it is generic).
fn static_urls(page: &str) -> String {
    const OPEN: &str = "{{ url_for('static', filename='";
    const CLOSE: &str = "') }}";
    let mut out = String::with_capacity(page.len());
    let mut rest = page;
    while let Some(start) = rest.find(OPEN) {
        out.push_str(&rest[..start]);
        let after = &rest[start + OPEN.len()..];
        match after.find(CLOSE) {
            Some(end) => {
                out.push_str("/static/");
                out.push_str(&after[..end]);
                rest = &after[end + CLOSE.len()..];
            }
            None => {
                out.push_str(&rest[start..]);
                return out;
            }
        }
    }
    out.push_str(rest);
    out
}

/// The msgids of the `{{_('…')}}` / `{{ _('…') }}` labels in the template, found by scanning it, so a new label in
/// `read.html` is translated (or, absent from the catalogs, left as its msgid) instead of left as Jinja.
fn msgids() -> Vec<String> {
    let mut found = Vec::new();
    for marker in ["{{_('", "{{ _('"] {
        let mut rest = TEMPLATE;
        while let Some(start) = rest.find(marker) {
            let after = &rest[start + marker.len()..];
            if let Some(end) = after.find('\'') {
                let msgid = after[..end].to_owned();
                if !found.contains(&msgid) {
                    found.push(msgid);
                }
                rest = &after[end..];
            } else {
                break;
            }
        }
    }
    found
}

#[cfg(test)]
mod tests {
    use super::{msgids, render_page, translate};

    #[test]
    fn every_msgid_the_template_uses_has_a_translation_entry() {
        let template = super::TEMPLATE;
        assert!(msgids().len() >= 20, "the scan finds the template's labels");
        for msgid in msgids() {
            let single = format!("{{{{_('{msgid}')}}}}");
            let spaced = format!("{{{{ _('{msgid}') }}}}");
            let json = format!("{{{{ _('{msgid}') | tojson }}}}");
            assert!(
                template.contains(&single)
                    || template.contains(&spaced)
                    || template.contains(&json),
                "template does not use {msgid:?}"
            );
        }
        assert!(
            translate("de", "Settings") != "Settings",
            "German catalog is used"
        );
        assert_eq!(translate("en", "Settings"), "Settings");
    }

    #[test]
    fn rendered_page_has_no_jinja_left() {
        let page = render_page(7, "Café & co", "en", "1.2.3");
        assert!(!page.contains("{{") && !page.contains("{%"));
        assert!(page.contains("<title>epub Reader | Café &amp; co</title>"));
        assert!(page.contains("value=\"1.2.3\""));
        assert!(page.contains("manifestUrl: \"/show/readium/7/manifest.json\""));
        assert!(page.contains("bookmarkUrl: \"/ajax/bookmark/7/epub\""));
        assert!(page.contains("useBookmarks: false"));
        assert!(page.contains("bookId: 7"));
        assert!(page.contains("/static/js/libs/readium.js"));
    }
}
