//! Bulk actions of the book manager: tick rows, then archive, unarchive or set one field directly or after a confirm
//! step. Port of `bulk_preview` / `bulk_run` in `cps/editbooks.py`.
//!
//! Left to Flask on purpose: read/unread (they create Kobo reading-state rows), merge and delete. Those cascade into
//! state only Flask holds (the debounced duplicate-index scan, the thumbnail task queue, shelves, the Kobo tables), so
//! each of them is proxied with the request untouched until the task worker itself is ported. A bare POST can never
//! change data here: `set` refuses without `confirm=yes`.

use crate::bookedit::Field;
use crate::books_admin::{
    Editor, audit_edit, editor, field_label, read_connection, run_save, text, visibility,
};
use crate::download::escape_html as e;
use crate::twofa::{client_ip, csrf_ok, now, page, parse_form};
use crate::{AppState, authdb};
use axum::body::Bytes;
use axum::extract::State;
use axum::http::{HeaderMap, HeaderValue, StatusCode};
use axum::response::{IntoResponse, Response};
use rusqlite::params_from_iter;
use std::sync::Arc;

const BULK_MAX_BOOKS: usize = 200;
const SHOWN: usize = 10;
const SET_FIELDS: [Field; 5] = [
    Field::Authors,
    Field::Tags,
    Field::Series,
    Field::Publishers,
    Field::Languages,
];

/// The bar above the table: ticked-row counter, direct actions, the set-a-field form and the Flask-owned actions.
pub fn bar(locale: &str, can_delete: bool) -> String {
    let direct: String = [
        ("archive", "archive"),
        ("unarchive", "unarchive"),
        ("read", "read"),
        ("unread", "unread"),
    ]
    .iter()
    .map(|(action, key)| {
        format!(
            "<button type=\"button\" hx-post=\"/admin/books/bulk/run\" hx-vals='{{\"action\": \"{action}\"}}' \
             hx-include=\"#booklist input[name=ids]:checked\" hx-target=\"#bulk-result\" hx-swap=\"innerHTML\">{}</button>",
            e(text(locale, key))
        )
    })
    .collect();
    let options: String = SET_FIELDS
        .iter()
        .map(|field| {
            format!(
                "<option value=\"{}\">{}</option>",
                field.key(),
                e(field_label(locale, *field))
            )
        })
        .collect();
    let sel = "#booklist input[name=ids]:checked";
    let dangerous = if can_delete {
        format!(
            "\n    <button type=\"button\" hx-post=\"/admin/books/bulk/preview\" hx-vals='{{\"action\": \"merge\"}}' hx-include=\"{sel}\" hx-target=\"#bulk-result\" hx-swap=\"innerHTML\">{merge}</button>\n    \
             <button type=\"button\" class=\"plain-danger\" hx-post=\"/admin/books/bulk/preview\" hx-vals='{{\"action\": \"delete\"}}' hx-include=\"{sel}\" hx-target=\"#bulk-result\" hx-swap=\"innerHTML\">{delete}</button>",
            merge = e(text(locale, "merge")),
            delete = e(text(locale, "delete")),
        )
    } else {
        String::new()
    };
    format!(
        "<fieldset id=\"bulk-bar\" class=\"plain-section\">\n  <legend>{selected} <span id=\"bulk-count\" class=\"plain-badge\">0</span></legend>\n  \
         <div class=\"plain-actions\">\n    {direct}\n  </div>\n  <div class=\"plain-actions\">\n    \
         <label class=\"sr-only\" for=\"bulk-field\">{field}</label>\n    <select id=\"bulk-field\" name=\"field\">{options}</select>\n    \
         <label class=\"sr-only\" for=\"bulk-value\">{value}</label>\n    \
         <input id=\"bulk-value\" type=\"text\" name=\"value\" placeholder=\"{placeholder}\" autocomplete=\"off\">\n    \
         <button type=\"button\" hx-post=\"/admin/books/bulk/preview\" hx-vals='{{\"action\": \"set\"}}' hx-include=\"{sel}, #bulk-field, #bulk-value\" \
         hx-target=\"#bulk-result\" hx-swap=\"innerHTML\">{set}</button>{dangerous}\n  </div>\n</fieldset>\n",
        selected = e(text(locale, "selected")),
        field = e(text(locale, "field")),
        value = e(text(locale, "new_value")),
        placeholder = e(text(locale, "new_value_ph")),
        set = e(text(locale, "set")),
    )
}

fn lines_html(lines: &[(&str, String)]) -> String {
    lines
        .iter()
        .map(|(kind, message)| {
            format!(
                "<div class=\"flash flash-{kind}\" role=\"{}\">{}</div>",
                if *kind == "error" { "alert" } else { "status" },
                e(message)
            )
        })
        .collect()
}

fn message(locale: &str, kind: &'static str, key: &str) -> Response {
    let _ = locale;
    page(lines_html(&[(kind, key.to_owned())]), StatusCode::OK)
}

fn ids_of(form: &[(String, String)]) -> Vec<i64> {
    let mut seen = Vec::new();
    for (key, value) in form {
        if key == "ids"
            && let Ok(id) = value.parse::<i64>()
            && !seen.contains(&id)
        {
            seen.push(id);
        }
    }
    seen.truncate(BULK_MAX_BOOKS);
    seen
}

fn value_of<'a>(form: &'a [(String, String)], name: &str) -> &'a str {
    form.iter()
        .rev()
        .find(|(key, _)| key == name)
        .map_or("", |(_, v)| v.as_str())
}

/// The posted books this account may see, in the order posted, with titles; `skipped` counts the rest.
async fn selection(editor: &Editor, ids: Vec<i64>) -> Option<(Vec<(i64, String)>, usize)> {
    let access = editor.access.clone();
    let settings = editor.settings.clone();
    let asked = ids.len();
    let found = tokio::task::spawn_blocking(move || {
        let conn = read_connection(&settings).ok()?;
        let (visible, args) = visibility(&access);
        let mut books = Vec::new();
        for id in ids {
            let mut all = args.clone();
            all.push(id.to_string());
            let title: Option<String> = conn
                .query_row(
                    &format!(
                        "SELECT b.title FROM books b WHERE {visible} AND b.id = CAST(? AS INTEGER)"
                    ),
                    params_from_iter(all.iter()),
                    |row| row.get(0),
                )
                .ok();
            if let Some(title) = title {
                books.push((id, title));
            }
        }
        Some(books)
    })
    .await
    .ok()
    .flatten()?;
    let skipped = asked - found.len();
    Some((found, skipped))
}

async fn flask(state: &Arc<AppState>, path: &str, headers: HeaderMap, body: Bytes) -> Response {
    crate::proxy::fallback_with_body(
        state.clone(),
        path,
        axum::http::Method::POST,
        headers,
        body.to_vec(),
    )
    .await
}

pub async fn preview(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let editor = match editor(&state, &headers, "/admin/books").await {
        Ok(editor) => editor,
        Err(response) => return *response,
    };
    let form = parse_form(&String::from_utf8_lossy(&body));
    let action = value_of(&form, "action").to_owned();
    if matches!(action.as_str(), "merge" | "delete") {
        return flask(&state, "/admin/books/bulk/preview", headers, body).await;
    }
    if action != "set" {
        return StatusCode::BAD_REQUEST.into_response();
    }
    let l = editor.locale;
    let Some((books, skipped)) = selection(&editor, ids_of(&form)).await else {
        return flask(&state, "/admin/books/bulk/preview", headers, body).await;
    };
    if books.is_empty() {
        return message(l, "error", select_one(l));
    }
    let Some(field) = Field::parse(value_of(&form, "field")).filter(|f| SET_FIELDS.contains(f))
    else {
        return message(l, "error", choose_field(l));
    };
    let value = value_of(&form, "value");
    page(
        confirm_html(&editor, field, value, &books, skipped),
        StatusCode::OK,
    )
}

fn select_one(locale: &str) -> &'static str {
    if locale.starts_with("en") {
        "Select at least one book."
    } else {
        "Pilih setidaknya satu buku."
    }
}

fn choose_field(locale: &str) -> &'static str {
    if locale.starts_with("en") {
        "Choose a field to change."
    } else {
        "Pilih kolom yang akan diubah."
    }
}

fn confirm_html(
    editor: &Editor,
    field: Field,
    value: &str,
    books: &[(i64, String)],
    skipped: usize,
) -> String {
    let l = editor.locale;
    let english = l.starts_with("en");
    let label = field_label(l, field);
    let ids: String = books
        .iter()
        .map(|(id, _)| format!("<input type=\"hidden\" name=\"ids\" value=\"{id}\">"))
        .collect();
    let shown: String = books
        .iter()
        .take(SHOWN)
        .map(|(id, title)| format!("<li>#{id} {}</li>", e(title)))
        .collect();
    let more = books.len().saturating_sub(SHOWN);
    let more = if more > 0 {
        format!(
            "<li class=\"plain-muted\">{}</li>",
            if english {
                format!("… and {more} more")
            } else {
                format!("… dan {more} lainnya")
            }
        )
    } else {
        String::new()
    };
    let question = if english {
        format!("Set {label} to “{value}” on {} books?", books.len())
    } else {
        format!("Ubah {label} menjadi “{value}” pada {} buku?", books.len())
    };
    let empty = if value.is_empty() {
        if english {
            format!(" The value is empty, so the existing {label} is removed.")
        } else {
            format!(" Nilainya kosong, sehingga {label} yang ada dihapus.")
        }
    } else {
        String::new()
    };
    let skipped = if skipped > 0 {
        format!(
            "<p class=\"plain-muted\">{}</p>",
            if english {
                format!("{skipped} selected books are not available and were left out.")
            } else {
                format!("{skipped} buku terpilih tidak tersedia dan dilewati.")
            }
        )
    } else {
        String::new()
    };
    format!(
        "<form class=\"flash flash-warning\" hx-post=\"/admin/books/bulk/run\" hx-target=\"#bulk-result\" hx-swap=\"innerHTML\" hx-disabled-elt=\"find button\">\n  \
         <input type=\"hidden\" name=\"action\" value=\"set\">\n  <input type=\"hidden\" name=\"confirm\" value=\"yes\">\n  \
         <input type=\"hidden\" name=\"field\" value=\"{key}\"><input type=\"hidden\" name=\"value\" value=\"{value_attr}\">\n  {ids}\n  \
         <p><strong>{question}</strong>{empty}</p>\n  <ul>{shown}{more}</ul>\n  {skipped}\n  \
         <div class=\"plain-actions\">\n    <button type=\"submit\" class=\"plain-danger\">{apply}</button>\n    \
         <button type=\"button\" onclick=\"this.closest('form').remove()\">{cancel}</button>\n  </div>\n</form>",
        key = field.key(),
        value_attr = e(value),
        question = e(&question),
        empty = e(&empty),
        apply = if english { "Apply" } else { "Terapkan" },
        cancel = e(text(l, "cancel")),
    )
}

pub async fn run(State(state): State<Arc<AppState>>, headers: HeaderMap, body: Bytes) -> Response {
    let editor = match editor(&state, &headers, "/admin/books").await {
        Ok(editor) => editor,
        Err(response) => return *response,
    };
    let form = parse_form(&String::from_utf8_lossy(&body));
    let action = value_of(&form, "action").to_owned();
    // Everything Flask still owns goes there with the request as it came.
    if matches!(action.as_str(), "read" | "unread" | "merge" | "delete") {
        return flask(&state, "/admin/books/bulk/run", headers, body).await;
    }
    if !matches!(action.as_str(), "archive" | "unarchive" | "set") {
        return StatusCode::BAD_REQUEST.into_response();
    }
    let header_token = headers
        .get("x-csrftoken")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_owned();
    let mut with_token = form.clone();
    if !header_token.is_empty() {
        with_token.push(("csrf_token".to_owned(), header_token));
    }
    let l = editor.locale;
    if !csrf_ok(&state, &headers, &with_token, &editor.secret, now()).await {
        return (StatusCode::BAD_REQUEST, text(l, "csrf")).into_response();
    }
    let english = l.starts_with("en");
    if action == "set" && value_of(&form, "confirm") != "yes" {
        return message(
            l,
            "error",
            if english {
                "This action needs to be confirmed first."
            } else {
                "Tindakan ini perlu dikonfirmasi dulu."
            },
        );
    }
    let Some((books, skipped)) = selection(&editor, ids_of(&form)).await else {
        return flask(&state, "/admin/books/bulk/run", headers, body).await;
    };
    if books.is_empty() {
        return message(l, "error", select_one(l));
    }
    let ids: Vec<i64> = books.iter().map(|(id, _)| *id).collect();
    let mut lines: Vec<(&str, String)> = Vec::new();
    if action == "set" {
        let Some(field) = Field::parse(value_of(&form, "field")).filter(|f| SET_FIELDS.contains(f))
        else {
            return message(l, "error", choose_field(l));
        };
        let value = value_of(&form, "value").to_owned();
        let label = field_label(l, field);
        let mut failures: Vec<String> = Vec::new();
        for id in &ids {
            if let Err(error) = run_save(&state, &editor, *id, field, &value).await
                && !failures.contains(&error)
            {
                failures.push(error);
            }
        }
        if failures.is_empty() {
            audit_edit(&state, &editor, &headers, field, &ids).await;
            lines.push((
                "success",
                if english {
                    format!("Changed {label} on {} books.", ids.len())
                } else {
                    format!("{label} diubah pada {} buku.", ids.len())
                },
            ));
        } else {
            for failure in failures {
                lines.push((
                    "error",
                    if english {
                        format!("Could not change {label}: {failure}")
                    } else {
                        format!("Tidak dapat mengubah {label}: {failure}")
                    },
                ));
            }
        }
    } else {
        let archive = action == "archive";
        let (app_db, user, ip) = (state.app_db.clone(), editor.access.id, client_ip(&headers));
        let todo = ids.clone();
        let done = tokio::task::spawn_blocking(move || {
            for id in todo {
                authdb::set_archived(&app_db, user, id, archive)?;
                let details = format!(
                    "Book archive status set to: {}",
                    if archive { "True" } else { "False" }
                );
                authdb::audit_resource(
                    &app_db,
                    user,
                    "edit",
                    "book",
                    Some(&id.to_string()),
                    &details,
                    &ip,
                );
            }
            Ok::<(), rusqlite::Error>(())
        })
        .await;
        match done {
            Ok(Ok(())) => lines.push((
                "success",
                match (archive, english) {
                    (true, true) => format!("Archived {} books.", ids.len()),
                    (true, false) => format!("{} buku diarsipkan.", ids.len()),
                    (false, true) => format!("Unarchived {} books.", ids.len()),
                    (false, false) => format!("{} buku dikeluarkan dari arsip.", ids.len()),
                },
            )),
            _ => lines.push(("error", "Error".to_owned())),
        }
    }
    if skipped > 0 {
        lines.push((
            "error",
            if english {
                format!("{skipped} selected books were not available and were skipped.")
            } else {
                format!("{skipped} buku terpilih tidak tersedia dan dilewati.")
            },
        ));
    }
    let mut response = page(lines_html(&lines), StatusCode::OK);
    response
        .headers_mut()
        .insert("hx-trigger", HeaderValue::from_static("books-changed"));
    response
}
