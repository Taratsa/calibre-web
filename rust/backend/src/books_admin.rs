//! The plain book manager (`/admin/books`): search the catalogue, page through it and edit one field of a book in
//! place. A Rust port of `manage_books*` in `cps/editbooks.py`; the saves are `bookedit::save_field`.
//!
//! What Rust does not reproduce goes to Flask unchanged: an account with a language filter on a library that has a
//! restricted custom column or searchable custom columns, and the bulk actions that need Flask-owned state (delete and
//! merge cascade into shelves, downloads and Kobo tables; see `bulk`). The listing follows Flask's visibility rules
//! (`common_filters`): the account's allowed and denied tags and its language filter.

use crate::bookedit::{Env, Field, SaveError};
use crate::download::escape_html as e;
use crate::twofa::{client_ip, csrf_ok, locale, now, page, parse_form, redirect};
use crate::{AppState, auth_page, authdb, session, settings};
use axum::Router;
use axum::body::Bytes;
use axum::extract::{Path, Query, State};
use axum::http::{HeaderMap, StatusCode};
use axum::response::Response;
use axum::routing::{get, post};
use rusqlite::{Connection, params_from_iter};
use std::collections::HashMap;
use std::sync::Arc;

const ROLE_ADMIN: i64 = 1;
const ROLE_EDIT: i64 = 1 << 3;
const ROLE_DELETE_BOOKS: i64 = 1 << 7;
/// Rows per page when the setting is missing (`config_books_per_page` default).
const DEFAULT_PER_PAGE: i64 = 60;

pub fn routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/admin/books", get(manage))
        .route("/admin/books/rows", get(rows))
        .route("/admin/books/{id}/{field}", get(cell).post(save))
        .route("/admin/books/{id}/{field}/edit", get(cell_edit))
        .route(
            "/admin/books/bulk/preview",
            post(crate::books_bulk::preview),
        )
        .route("/admin/books/bulk/run", post(crate::books_bulk::run))
}

/// The signed-in editor (admin or edit role), or the response to send instead.
pub(crate) struct Editor {
    pub settings: settings::Settings,
    pub access: settings::Access,
    pub name: String,
    pub secret: Vec<u8>,
    pub locale: &'static str,
    /// The account's own language (`user.locale`), which language names are typed and shown in.
    pub user_locale: String,
}

impl Editor {
    pub fn can_delete(&self) -> bool {
        self.access.role & ROLE_DELETE_BOOKS != 0
    }
}

pub(crate) async fn editor(
    state: &Arc<AppState>,
    headers: &HeaderMap,
    uri: &str,
) -> Result<Editor, Box<Response>> {
    let to_login = || {
        let next: String = form_urlencoded::byte_serialize(uri.as_bytes()).collect();
        Box::new(redirect(&format!("/login?next={next}"), None))
    };
    let settings = state.settings().await.map_err(|_| to_login())?;
    let secret = state.secret(&settings);
    let locale = locale(headers);
    let access = match session::identify(state, &settings, headers).await {
        Ok(session::Who::User(access)) => access,
        _ => return Err(to_login()),
    };
    let (app_db, id) = (state.app_db.clone(), access.id);
    let (name, user_locale) = tokio::task::spawn_blocking(move || {
        let name = authdb::user_name(&app_db, id).ok().flatten();
        let locale = settings::open_read_only(&app_db)
            .and_then(|conn| {
                conn.query_row("SELECT locale FROM user WHERE id = ?1", [id], |row| {
                    row.get::<_, Option<String>>(0)
                })
            })
            .ok()
            .flatten()
            .filter(|locale| !locale.is_empty())
            .unwrap_or_else(|| "en".to_owned());
        (name, locale)
    })
    .await
    .map_err(|_| to_login())?;
    let name = name.ok_or_else(to_login)?;
    if access.role & (ROLE_ADMIN | ROLE_EDIT) == 0 {
        return Err(Box::new(page(
            auth_page::notice_page(
                &settings.title,
                locale,
                "403",
                text(locale, "forbidden"),
                Some(("/", text(locale, "home"))),
            ),
            StatusCode::FORBIDDEN,
        )));
    }
    Ok(Editor {
        settings: (*settings).clone(),
        access,
        name,
        secret,
        locale,
        user_locale,
    })
}

pub(crate) fn text(locale: &str, key: &str) -> &'static str {
    let english = locale.starts_with("en");
    match (key, english) {
        ("title", true) => "Manage Books",
        ("title", false) => "Kelola Buku",
        ("subtitle", true) => {
            "Search the whole library and click a value to change it. Every save is logged in the audit log."
        }
        ("subtitle", false) => {
            "Cari seluruh pustaka dan klik nilai untuk mengubahnya. Setiap perubahan dicatat di log audit."
        }
        ("search", true) => "Search Library",
        ("search", false) => "Cari di pustaka",
        ("forbidden", true) => "You are not allowed to edit books.",
        ("forbidden", false) => "Anda tidak diizinkan menyunting buku.",
        ("home", true) => "Home",
        ("home", false) => "Beranda",
        ("full", true) => "Full editor",
        ("full", false) => "Editor lengkap",
        ("edit", true) => "Edit",
        ("edit", false) => "Sunting",
        ("save", true) => "Save",
        ("save", false) => "Simpan",
        ("cancel", true) => "Cancel",
        ("cancel", false) => "Batal",
        ("prev", true) => "Previous",
        ("prev", false) => "Sebelumnya",
        ("next", true) => "Next",
        ("next", false) => "Berikutnya",
        ("pagination", true) => "Pagination",
        ("pagination", false) => "Halaman",
        ("none", true) => "No Results Found",
        ("none", false) => "Tidak ada hasil",
        ("more", true) => "More results follow",
        ("more", false) => "Hasil lain menyusul",
        ("results_for", true) => "Results for:",
        ("results_for", false) => "Hasil untuk:",
        ("select_all", true) => "Select all on this page",
        ("select_all", false) => "Pilih semua di halaman ini",
        ("select", true) => "Select",
        ("select", false) => "Pilih",
        ("selected", true) => "Selected books",
        ("selected", false) => "Buku terpilih",
        ("archive", true) => "Archive",
        ("archive", false) => "Arsipkan",
        ("unarchive", true) => "Unarchive",
        ("unarchive", false) => "Batal arsip",
        ("read", true) => "Mark as read",
        ("read", false) => "Tandai sudah dibaca",
        ("unread", true) => "Mark as unread",
        ("unread", false) => "Tandai belum dibaca",
        ("field", true) => "Field",
        ("field", false) => "Kolom",
        ("new_value", true) => "New value",
        ("new_value", false) => "Nilai baru",
        ("new_value_ph", true) => "New value (empty clears it)",
        ("new_value_ph", false) => "Nilai baru (kosong menghapusnya)",
        ("set", true) => "Set on selected…",
        ("set", false) => "Terapkan pada yang dipilih…",
        ("merge", true) => "Merge…",
        ("merge", false) => "Gabungkan…",
        ("delete", true) => "Delete…",
        ("delete", false) => "Hapus…",
        ("rename_author", true) => "Rename an author in every book…",
        ("rename_author", false) => "Ganti nama penulis di semua buku…",
        ("unavailable", true) => {
            "Oops! Selected book is unavailable. File does not exist or is not accessible"
        }
        ("unavailable", false) => {
            "Ups! Buku yang dipilih tidak tersedia. Berkas tidak ada atau tidak dapat diakses"
        }
        ("csrf", true) => "The form expired. Reload the page and try again.",
        ("csrf", false) => "Formulir kedaluwarsa. Muat ulang halaman dan coba lagi.",
        _ => "",
    }
}

pub(crate) fn field_label(locale: &str, field: Field) -> &'static str {
    let english = locale.starts_with("en");
    match (field, english) {
        (Field::Title, true) => "Title",
        (Field::Title, false) => "Judul",
        (Field::Authors, true) => "Author",
        (Field::Authors, false) => "Penulis",
        (Field::Tags, true) => "Categories",
        (Field::Tags, false) => "Kategori",
        (Field::Series, true) => "Series",
        (Field::Series, false) => "Seri",
        (Field::Publishers, true) => "Publisher",
        (Field::Publishers, false) => "Penerbit",
        (Field::Languages, true) => "Language",
        (Field::Languages, false) => "Bahasa",
    }
}

// --- what this account may see ----------------------------------------------------------------------------------------

/// `common_filters(allow_show_archived=True)` as SQL over `books b`, with its bound parameters. The archive filter is
/// off in the manager, so only the language filter and the allowed/denied tags remain.
pub(crate) fn visibility(access: &settings::Access) -> (String, Vec<String>) {
    let mut clauses: Vec<String> = Vec::new();
    let mut args: Vec<String> = Vec::new();
    if access.language != "all" && !access.language.is_empty() {
        clauses.push(
            "EXISTS (SELECT 1 FROM books_languages_link kl JOIN languages g ON g.id = kl.lang_code \
             WHERE kl.book = b.id AND g.lang_code = ?)"
                .to_owned(),
        );
        args.push(access.language.clone());
    }
    let list = |value: &str| -> Vec<String> {
        let tags: Vec<String> = value
            .split(',')
            .map(|tag| crate::filename::strip_whitespaces(tag).to_owned())
            .collect();
        if tags == [String::new()] {
            Vec::new()
        } else {
            tags
        }
    };
    let (denied, allowed) = (list(&access.denied), list(&access.allowed));
    let marks = |n: usize| vec!["?"; n].join(",");
    if !denied.is_empty() {
        clauses.push(format!(
            "NOT EXISTS (SELECT 1 FROM books_tags_link kt JOIN tags t ON t.id = kt.tag \
             WHERE kt.book = b.id AND t.name IN ({}))",
            marks(denied.len())
        ));
        args.extend(denied);
    }
    if !allowed.is_empty() {
        clauses.push(format!(
            "EXISTS (SELECT 1 FROM books_tags_link kt JOIN tags t ON t.id = kt.tag \
             WHERE kt.book = b.id AND t.name IN ({}))",
            marks(allowed.len())
        ));
        args.extend(allowed);
    }
    let sql = if clauses.is_empty() {
        "1".to_owned()
    } else {
        clauses.join(" AND ")
    };
    (sql, args)
}

/// Things this port does not model, so the request is left to Flask: a restricted custom column (an extra visibility
/// rule over custom-column tables) and searchable custom columns (the search would need them too).
fn needs_flask(app_db: &std::path::Path, metadata: &Connection) -> bool {
    let restricted = settings::open_read_only(app_db)
        .and_then(|conn| {
            conn.query_row(
                "SELECT COALESCE(config_restricted_column, 0) FROM settings LIMIT 1",
                [],
                |row| row.get::<_, i64>(0),
            )
        })
        .unwrap_or(1);
    let custom: i64 = metadata
        .query_row("SELECT count(*) FROM custom_columns", [], |row| row.get(0))
        .unwrap_or(1);
    restricted != 0 || custom != 0
}

fn per_page(app_db: &std::path::Path) -> i64 {
    settings::open_read_only(app_db)
        .and_then(|conn| {
            conn.query_row(
                "SELECT config_books_per_page FROM settings LIMIT 1",
                [],
                |row| row.get::<_, Option<i64>>(0),
            )
        })
        .ok()
        .flatten()
        .filter(|n| *n > 0)
        .unwrap_or(DEFAULT_PER_PAGE)
}

/// `db.lcase`: Flask replaces SQLite's `lower()` with `unidecode(s.lower())`, so every `ilike` in its search folds
/// accents ("cafe" finds "Café"). The same function here keeps the matching identical.
pub(crate) fn register_lower(conn: &Connection) -> rusqlite::Result<()> {
    conn.create_scalar_function(
        "lower",
        1,
        rusqlite::functions::FunctionFlags::SQLITE_UTF8
            | rusqlite::functions::FunctionFlags::SQLITE_DETERMINISTIC,
        |ctx| {
            Ok(ctx
                .get::<Option<String>>(0)?
                .map(|text| deunicode::deunicode(&text.to_lowercase())))
        },
    )
}

pub(crate) struct Listing {
    pub ids: Vec<i64>,
    pub page: i64,
    pub has_next: bool,
    pub total: Option<i64>,
}

/// `_manage_listing`: newest first (`timestamp`), `per_page` rows, with or without a search term.
pub(crate) fn listing(
    conn: &Connection,
    access: &settings::Access,
    query: &str,
    page: i64,
    limit: i64,
) -> rusqlite::Result<Listing> {
    let page = page.max(1);
    let offset = (page - 1) * limit;
    let (visible, mut args) = visibility(access);
    if query.is_empty() {
        let total: i64 = conn.query_row(
            &format!("SELECT count(*) FROM books b WHERE {visible}"),
            params_from_iter(args.iter()),
            |row| row.get(0),
        )?;
        args.push(limit.to_string());
        args.push(offset.to_string());
        let mut statement = conn.prepare(&format!(
            "SELECT b.id FROM books b WHERE {visible} ORDER BY b.timestamp DESC, b.id DESC LIMIT CAST(? AS INTEGER) OFFSET CAST(? AS INTEGER)"
        ))?;
        let ids = statement
            .query_map(params_from_iter(args.iter()), |row| row.get(0))?
            .collect::<rusqlite::Result<Vec<i64>>>()?;
        return Ok(Listing {
            ids,
            page,
            has_next: total > offset + limit,
            total: Some(total),
        });
    }
    // `search_query`: the stored term is stripped and lower-cased; every field is an `ilike '%term%'` (the authors
    // split on commas and spaces and every part must match ONE author), joined by OR.
    let term = crate::filename::strip_whitespaces(query).to_lowercase();
    let like = format!("%{term}%");
    let author_parts: Vec<String> = regex::Regex::new("[, ]+")
        .expect("static pattern")
        .split(&term)
        .map(|part| format!("%{part}%"))
        .collect();
    let author_filter = vec!["lower(a.name) LIKE lower(?)"; author_parts.len()].join(" AND ");
    let search = format!(
        "(b.id IN (SELECT l.book FROM books_tags_link l JOIN tags t ON t.id = l.tag WHERE lower(t.name) LIKE lower(?)) \
          OR b.id IN (SELECT l.book FROM books_series_link l JOIN series s ON s.id = l.series WHERE lower(s.name) LIKE lower(?)) \
          OR b.id IN (SELECT l.book FROM books_authors_link l JOIN authors a ON a.id = l.author WHERE {author_filter}) \
          OR b.id IN (SELECT l.book FROM books_publishers_link l JOIN publishers p ON p.id = l.publisher WHERE lower(p.name) LIKE lower(?)) \
          OR lower(b.title) LIKE lower(?))"
    );
    let mut all: Vec<String> = Vec::new();
    all.extend(args);
    all.push(like.clone());
    all.push(like.clone());
    all.extend(author_parts);
    all.push(like.clone());
    all.push(like);
    all.push((offset + limit + 1).to_string());
    let mut statement = conn.prepare(&format!(
        "SELECT b.id FROM books b WHERE {visible} AND {search} ORDER BY b.timestamp DESC, b.id DESC LIMIT CAST(? AS INTEGER)"
    ))?;
    let found = statement
        .query_map(params_from_iter(all.iter()), |row| row.get(0))?
        .collect::<rusqlite::Result<Vec<i64>>>()?;
    // The search only knows "at least this many" while more pages follow (`LIMIT offset+limit+1`).
    let has_next = i64::try_from(found.len()).unwrap_or(i64::MAX) > offset + limit;
    let total = (!has_next).then(|| i64::try_from(found.len()).unwrap_or(i64::MAX));
    let ids = found
        .into_iter()
        .skip(usize::try_from(offset).unwrap_or(0))
        .take(usize::try_from(limit).unwrap_or(0))
        .collect();
    Ok(Listing {
        ids,
        page,
        has_next,
        total,
    })
}

// --- rendering ----------------------------------------------------------------------------------------------------------

/// One book as the manager shows it: the text of each editable cell.
pub(crate) struct Row {
    pub id: i64,
    pub cells: Vec<(Field, String)>,
}

/// `_manage_cell_text`: authors in the order of `author_sort` with `|` shown as `,`, languages by name in the account's
/// locale, the rest as the stored names joined by ", ".
pub(crate) fn cell_text(
    conn: &Connection,
    locale: &str,
    id: i64,
    field: Field,
) -> rusqlite::Result<String> {
    let joined = |sql: &str| -> rusqlite::Result<String> {
        let mut statement = conn.prepare(sql)?;
        let names = statement
            .query_map([id], |row| row.get::<_, String>(0))?
            .collect::<rusqlite::Result<Vec<_>>>()?;
        Ok(names.join(", "))
    };
    match field {
        Field::Title => conn.query_row("SELECT title FROM books WHERE id = ?1", [id], |row| {
            row.get(0)
        }),
        Field::Authors => {
            let author_sort: String = conn
                .query_row(
                    "SELECT COALESCE(author_sort, '') FROM books WHERE id = ?1",
                    [id],
                    |row| row.get(0),
                )
                .unwrap_or_default();
            let mut statement = conn.prepare(
                "SELECT a.id, a.name, COALESCE(a.sort, '') FROM books_authors_link l JOIN authors a ON a.id = l.author \
                 WHERE l.book = ?1 ORDER BY l.id",
            )?;
            let found = statement
                .query_map([id], |row| {
                    Ok((
                        row.get::<_, i64>(0)?,
                        row.get::<_, String>(1)?,
                        row.get::<_, String>(2)?,
                    ))
                })?
                .collect::<rusqlite::Result<Vec<_>>>()?;
            // `order_authors`: follow author_sort, then append whoever is left.
            let mut ordered: Vec<&(i64, String, String)> = Vec::new();
            for part in author_sort.split('&') {
                let part = crate::filename::strip_whitespaces(part);
                if let Some(author) = found.iter().find(|author| author.2 == part)
                    && !ordered.iter().any(|seen| seen.0 == author.0)
                {
                    ordered.push(author);
                }
            }
            for author in &found {
                if !ordered.iter().any(|seen| seen.0 == author.0) {
                    ordered.push(author);
                }
            }
            Ok(ordered
                .iter()
                .map(|a| a.1.replace('|', ","))
                .collect::<Vec<_>>()
                .join(" & "))
        }
        Field::Tags => joined(
            "SELECT t.name FROM books_tags_link l JOIN tags t ON t.id = l.tag WHERE l.book = ?1 ORDER BY t.name",
        ),
        Field::Series => joined(
            "SELECT s.name FROM books_series_link l JOIN series s ON s.id = l.series WHERE l.book = ?1 ORDER BY l.id",
        ),
        Field::Publishers => joined(
            "SELECT p.name FROM books_publishers_link l JOIN publishers p ON p.id = l.publisher WHERE l.book = ?1 ORDER BY l.id",
        ),
        Field::Languages => {
            let table = crate::suggest::names_for(locale);
            let mut statement = conn.prepare(
                "SELECT g.lang_code FROM books_languages_link l JOIN languages g ON g.id = l.lang_code WHERE l.book = ?1 ORDER BY l.id",
            )?;
            let codes = statement
                .query_map([id], |row| row.get::<_, String>(0))?
                .collect::<rusqlite::Result<Vec<_>>>()?;
            Ok(codes
                .iter()
                .map(|code| {
                    table
                        .iter()
                        .find(|(c, _)| c == code)
                        .map_or("Unknown", |(_, name)| name)
                })
                .collect::<Vec<_>>()
                .join(", "))
        }
    }
}

pub(crate) fn cell_html(locale: &str, id: i64, field: Field, text_value: &str) -> String {
    format!(
        "<button type=\"button\" class=\"cell-edit\" hx-get=\"/admin/books/{id}/{key}/edit\" hx-target=\"closest td\" \
         hx-swap=\"innerHTML\" title=\"{edit}: {label}\">{shown}</button>",
        key = field.key(),
        edit = e(text(locale, "edit")),
        label = e(field_label(locale, field)),
        shown = if text_value.is_empty() {
            "—".to_owned()
        } else {
            e(text_value)
        },
    )
}

pub(crate) fn cell_edit_html(
    locale: &str,
    id: i64,
    field: Field,
    value: &str,
    error: Option<&str>,
) -> String {
    let key = field.key();
    let label = e(field_label(locale, field));
    let error = error
        .map(|message| {
            format!(
                "\n  <div class=\"plain-danger\" role=\"alert\">{}</div>",
                e(message)
            )
        })
        .unwrap_or_default();
    format!(
        "<form class=\"cell-form\" hx-post=\"/admin/books/{id}/{key}\" hx-target=\"closest td\" hx-swap=\"innerHTML\">\n  \
         <label class=\"sr-only\" for=\"v-{id}-{key}\">{label}</label>\n  \
         <input id=\"v-{id}-{key}\" type=\"text\" name=\"value\" value=\"{value}\" autofocus autocomplete=\"off\">\n  \
         <button type=\"submit\">{save}</button>\n  \
         <button type=\"button\" hx-get=\"/admin/books/{id}/{key}\" hx-target=\"closest td\" hx-swap=\"innerHTML\">{cancel}</button>{error}\n</form>",
        value = e(value),
        save = e(text(locale, "save")),
        cancel = e(text(locale, "cancel")),
    )
}

fn pager(locale: &str, query: &str, listing: &Listing) -> String {
    if listing.page <= 1 && !listing.has_next {
        return String::new();
    }
    let q: String = if query.is_empty() {
        String::new()
    } else {
        format!(
            "&q={}",
            form_urlencoded::byte_serialize(query.as_bytes()).collect::<String>()
        )
    };
    let button = |page: i64, label: &str| {
        format!(
            "<button type=\"button\" hx-get=\"/admin/books/rows?page={page}{q}\" hx-target=\"#booklist\" hx-swap=\"innerHTML\">{}</button>",
            e(label)
        )
    };
    format!(
        "<nav class=\"plain-actions\" aria-label=\"{}\">\n  {}\n  <span class=\"plain-badge\" aria-current=\"page\">{}</span>\n  {}\n</nav>\n",
        e(text(locale, "pagination")),
        if listing.page > 1 {
            button(listing.page - 1, text(locale, "prev"))
        } else {
            String::new()
        },
        listing.page,
        if listing.has_next {
            button(listing.page + 1, text(locale, "next"))
        } else {
            String::new()
        },
    )
}

/// `plain_books_rows.html`: the result table and pager that the search box and the pager swap into `#booklist`.
pub(crate) fn rows_html(locale: &str, query: &str, listing: &Listing, rows: &[Row]) -> String {
    let count = match listing.total {
        Some(total) => {
            if locale.starts_with("en") {
                format!("{total} books")
            } else {
                format!("{total} buku")
            }
        }
        None => text(locale, "more").to_owned(),
    };
    let results = if query.is_empty() {
        String::new()
    } else {
        format!(" · {} {}", text(locale, "results_for"), e(query))
    };
    let head: String = Field::ALL
        .iter()
        .map(|field| format!("<th>{}</th>", e(field_label(locale, *field))))
        .collect();
    let body: String = if rows.is_empty() {
        format!(
            "<tr><td colspan=\"{}\">{}</td></tr>",
            Field::ALL.len() + 3,
            e(text(locale, "none"))
        )
    } else {
        rows.iter()
            .map(|row| {
                let cells: String = row
                    .cells
                    .iter()
                    .map(|(field, value)| format!("<td>{}</td>", cell_html(locale, row.id, *field, value)))
                    .collect();
                format!(
                    "<tr id=\"book-{id}\"><td><input type=\"checkbox\" name=\"ids\" value=\"{id}\" aria-label=\"{select} #{id}\"></td>\
                     <td><a href=\"/book/{id}/\">{id}</a></td>{cells}<td><a href=\"/admin/book/{id}\">{full}</a></td></tr>\n",
                    id = row.id,
                    select = e(text(locale, "select")),
                    full = e(text(locale, "full")),
                )
            })
            .collect()
    };
    format!(
        "<input type=\"hidden\" name=\"page\" value=\"{page}\">\n\
         <p class=\"plain-muted\" role=\"status\" aria-live=\"polite\">{count}{results}</p>\n\
         <div class=\"plain-table-wrap\">\n  <table>\n    <thead><tr><th><input type=\"checkbox\" id=\"select-all\" aria-label=\"{all}\"></th><th>#</th>{head}<th></th></tr></thead>\n    <tbody>\n{body}    </tbody>\n  </table>\n</div>\n{pager}",
        page = listing.page,
        all = e(text(locale, "select_all")),
        pager = pager(locale, query, listing),
    )
}

fn load_rows(conn: &Connection, locale: &str, ids: &[i64]) -> rusqlite::Result<Vec<Row>> {
    ids.iter()
        .map(|id| {
            Ok(Row {
                id: *id,
                cells: Field::ALL
                    .iter()
                    .map(|field| Ok((*field, cell_text(conn, locale, *id, *field)?)))
                    .collect::<rusqlite::Result<Vec<_>>>()?,
            })
        })
        .collect()
}

/// A read-only connection with Flask's accent-folding `lower()`.
pub(crate) fn read_connection(settings: &settings::Settings) -> rusqlite::Result<Connection> {
    let conn = settings::open_read_only(&settings.metadata_db())?;
    register_lower(&conn)?;
    Ok(conn)
}

// --- handlers -----------------------------------------------------------------------------------------------------------

fn query_text(query: &HashMap<String, String>) -> String {
    crate::filename::strip_whitespaces(query.get("q").map_or("", String::as_str)).to_owned()
}

fn page_number(query: &HashMap<String, String>) -> i64 {
    query.get("page").and_then(|p| p.parse().ok()).unwrap_or(1)
}

fn csrf_value(editor: &Editor, headers: &HeaderMap) -> String {
    let at = now();
    session::session_csrf(headers, &editor.secret, at)
        .ok()
        .flatten()
        .map(|value| session::csrf_token(&editor.secret, &value, at))
        .unwrap_or_default()
}

fn html(body: String, status: StatusCode) -> Response {
    page(body, status)
}

/// Run a read on the catalogue, off the async threads. `None` means "let Flask answer" (a shape this port does not
/// model, or a database error).
async fn read<T: Send + 'static>(
    state: &Arc<AppState>,
    editor: &Editor,
    job: impl FnOnce(&Connection, &settings::Settings) -> rusqlite::Result<T> + Send + 'static,
) -> Option<T> {
    let settings = editor.settings.clone();
    let app_db = state.app_db.clone();
    tokio::task::spawn_blocking(move || {
        let conn = read_connection(&settings).ok()?;
        if needs_flask(&app_db, &conn) {
            return None;
        }
        job(&conn, &settings).ok()
    })
    .await
    .ok()
    .flatten()
}

async fn to_flask(
    state: &Arc<AppState>,
    uri: &axum::http::Uri,
    method: axum::http::Method,
    headers: HeaderMap,
    body: Vec<u8>,
) -> Response {
    let path = uri
        .path_and_query()
        .map_or_else(|| uri.path().to_owned(), |p| p.as_str().to_owned());
    crate::proxy::fallback_with_body(state.clone(), &path, method, headers, body).await
}

async fn manage(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    uri: axum::http::Uri,
    Query(query): Query<HashMap<String, String>>,
) -> Response {
    let editor = match editor(&state, &headers, "/admin/books").await {
        Ok(editor) => editor,
        Err(response) => return *response,
    };
    let (q, number) = (query_text(&query), page_number(&query));
    let (access, locale, user_locale) = (
        editor.access.clone(),
        editor.locale,
        editor.user_locale.clone(),
    );
    let app_db = state.app_db.clone();
    let q2 = q.clone();
    let result = read(&state, &editor, move |conn, _| {
        let limit = per_page(&app_db);
        let found = listing(conn, &access, &q2, number, limit)?;
        let rows = load_rows(conn, &user_locale, &found.ids)?;
        Ok((found, rows))
    })
    .await;
    let Some((found, rows)) = result else {
        return to_flask(&state, &uri, axum::http::Method::GET, headers, Vec::new()).await;
    };
    let csrf = csrf_value(&editor, &headers);
    let table = rows_html(locale, &q, &found, &rows);
    let body = manage_page(&editor, &csrf, &q, &table);
    html(body, StatusCode::OK)
}

async fn rows(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    uri: axum::http::Uri,
    Query(query): Query<HashMap<String, String>>,
) -> Response {
    let editor = match editor(&state, &headers, "/admin/books").await {
        Ok(editor) => editor,
        Err(response) => return *response,
    };
    let (q, number) = (query_text(&query), page_number(&query));
    let (access, locale, user_locale) = (
        editor.access.clone(),
        editor.locale,
        editor.user_locale.clone(),
    );
    let app_db = state.app_db.clone();
    let q2 = q.clone();
    let result = read(&state, &editor, move |conn, _| {
        let found = listing(conn, &access, &q2, number, per_page(&app_db))?;
        let rows = load_rows(conn, &user_locale, &found.ids)?;
        Ok((found, rows))
    })
    .await;
    match result {
        Some((found, rows)) => html(rows_html(locale, &q, &found, &rows), StatusCode::OK),
        None => to_flask(&state, &uri, axum::http::Method::GET, headers, Vec::new()).await,
    }
}

/// The book the account may see (`_managed_book`), else the 404 Flask gives.
async fn visible_book(state: &Arc<AppState>, editor: &Editor, id: i64) -> Result<bool, ()> {
    let access = editor.access.clone();
    read(state, editor, move |conn, _| {
        let (visible, args) = visibility(&access);
        let mut all = args;
        all.push(id.to_string());
        conn.query_row(
            &format!("SELECT count(*) FROM books b WHERE {visible} AND b.id = CAST(? AS INTEGER)"),
            params_from_iter(all.iter()),
            |row| row.get::<_, i64>(0),
        )
        .map(|n| n > 0)
    })
    .await
    .ok_or(())
}

fn not_found() -> Response {
    (StatusCode::NOT_FOUND, "Not found").into_response()
}

use axum::response::IntoResponse;

async fn cell_response(
    state: &Arc<AppState>,
    editor: &Editor,
    id: i64,
    field: Field,
    edit: bool,
    value: Option<(String, String)>,
) -> Option<Response> {
    let user_locale = editor.user_locale.clone();
    let locale = editor.locale;
    let text_value = read(state, editor, move |conn, _| {
        cell_text(conn, &user_locale, id, field)
    })
    .await?;
    let body = if edit {
        let (typed, error) = value.map_or((text_value.clone(), None), |(typed, error)| {
            (typed, Some(error))
        });
        cell_edit_html(locale, id, field, &typed, error.as_deref())
    } else {
        cell_html(locale, id, field, &text_value)
    };
    Some(html(body, StatusCode::OK))
}

async fn cell_common(
    state: Arc<AppState>,
    headers: HeaderMap,
    uri: axum::http::Uri,
    id: i64,
    field: String,
    edit: bool,
) -> Response {
    let editor = match editor(&state, &headers, "/admin/books").await {
        Ok(editor) => editor,
        Err(response) => return *response,
    };
    let Some(field) = Field::parse(&field) else {
        return not_found();
    };
    match visible_book(&state, &editor, id).await {
        Ok(true) => {}
        Ok(false) => return not_found(),
        Err(()) => {
            return to_flask(&state, &uri, axum::http::Method::GET, headers, Vec::new()).await;
        }
    }
    match cell_response(&state, &editor, id, field, edit, None).await {
        Some(response) => response,
        None => to_flask(&state, &uri, axum::http::Method::GET, headers, Vec::new()).await,
    }
}

async fn cell(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    uri: axum::http::Uri,
    Path((id, field)): Path<(i64, String)>,
) -> Response {
    cell_common(state, headers, uri, id, field, false).await
}

async fn cell_edit(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    uri: axum::http::Uri,
    Path((id, field)): Path<(i64, String)>,
) -> Response {
    cell_common(state, headers, uri, id, field, true).await
}

async fn save(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    uri: axum::http::Uri,
    Path((id, field)): Path<(i64, String)>,
    body: Bytes,
) -> Response {
    let editor = match editor(&state, &headers, "/admin/books").await {
        Ok(editor) => editor,
        Err(response) => return *response,
    };
    let Some(field) = Field::parse(&field) else {
        return not_found();
    };
    let form = parse_form(&String::from_utf8_lossy(&body));
    // htmx sends the token as a header (`hx-headers` on <body>); a plain form posts it as a field.
    let header_token = headers
        .get("x-csrftoken")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_owned();
    let mut with_token = form.clone();
    if !header_token.is_empty() {
        with_token.push(("csrf_token".to_owned(), header_token));
    }
    if !csrf_ok(&state, &headers, &with_token, &editor.secret, now()).await {
        return (StatusCode::BAD_REQUEST, text(editor.locale, "csrf")).into_response();
    }
    match visible_book(&state, &editor, id).await {
        Ok(true) => {}
        Ok(false) => return not_found(),
        Err(()) => {
            return to_flask(
                &state,
                &uri,
                axum::http::Method::POST,
                headers,
                body.to_vec(),
            )
            .await;
        }
    }
    let value = form
        .iter()
        .rev()
        .find(|(key, _)| key == "value")
        .map_or(String::new(), |(_, v)| v.clone());
    let outcome = run_save(&state, &editor, id, field, &value).await;
    match outcome {
        Ok(()) => {
            audit_edit(&state, &editor, &headers, field, &[id]).await;
            match cell_response(&state, &editor, id, field, false, None).await {
                Some(response) => response,
                None => to_flask(&state, &uri, axum::http::Method::GET, headers, Vec::new()).await,
            }
        }
        Err(message) => cell_response(&state, &editor, id, field, true, Some((value, message)))
            .await
            .unwrap_or_else(|| (StatusCode::INTERNAL_SERVER_ERROR, "error").into_response()),
    }
}

/// One save in a blocking task. Returns the message to show on failure.
pub(crate) async fn run_save(
    state: &Arc<AppState>,
    editor: &Editor,
    id: i64,
    field: Field,
    value: &str,
) -> Result<(), String> {
    let (settings, app_db) = (editor.settings.clone(), state.app_db.clone());
    let (user_locale, value) = (editor.user_locale.clone(), value.to_owned());
    let result = tokio::task::spawn_blocking(move || -> Result<(), SaveError> {
        let mut conn = crate::authors::open_library(
            &settings.metadata_db(),
            Some(crate::bookedit::title_regex(&app_db)),
        )?;
        let env = Env {
            library: settings.book_path(),
            unicode: settings.unicode_filename,
            locale: &user_locale,
        };
        crate::bookedit::save_field(&mut conn, &env, id, field, &value).map(|_| ())
    })
    .await;
    match result {
        Ok(Ok(())) => Ok(()),
        Ok(Err(SaveError::NotFound)) => Err(text(editor.locale, "unavailable").to_owned()),
        Ok(Err(error)) => {
            tracing::warn!("book {id} {} save failed: {}", field.key(), error.message());
            Err(error.message())
        }
        Err(error) => {
            tracing::error!("book save task failed: {error}");
            Err("Error".to_owned())
        }
    }
}

/// `record_list_edit`: one audit row per book (`edit`, resource `book`). The frontend rebuild is picked up by
/// `rebuildd`, which watches `metadata.db`.
pub(crate) async fn audit_edit(
    state: &Arc<AppState>,
    editor: &Editor,
    headers: &HeaderMap,
    field: Field,
    ids: &[i64],
) {
    let (app_db, user, ip) = (state.app_db.clone(), editor.access.id, client_ip(headers));
    let ids = ids.to_vec();
    let details = format!("Book field edited: {}", field.key());
    let _ = tokio::task::spawn_blocking(move || {
        for id in ids {
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
    })
    .await;
}

fn manage_page(editor: &Editor, csrf: &str, query: &str, table: &str) -> String {
    let l = editor.locale;
    let rename = if editor.access.role & ROLE_ADMIN != 0 {
        format!(
            "<p class=\"plain-muted\"><a class=\"button\" href=\"/admin/authors\">{}</a></p>\n",
            e(text(l, "rename_author"))
        )
    } else {
        String::new()
    };
    let body = format!(
        "<h1 class=\"plain-title\">{title}</h1>\n<p class=\"plain-subtitle\">{subtitle}</p>\n\
         <div class=\"plain-actions\">\n  <label class=\"sr-only\" for=\"manage-q\">{search}</label>\n  \
         <input id=\"manage-q\" type=\"search\" name=\"q\" value=\"{q}\" placeholder=\"{search}\" autocomplete=\"off\" autofocus \
         hx-get=\"/admin/books/rows\" hx-trigger=\"input changed delay:300ms, search\" hx-target=\"#booklist\" hx-swap=\"innerHTML\" hx-sync=\"this:replace\">\n</div>\n\
         {bulk}{rename}<div id=\"bulk-result\" aria-live=\"polite\"></div>\n\
         <div id=\"booklist\" aria-busy=\"false\" hx-get=\"/admin/books/rows\" hx-trigger=\"books-changed from:body\" \
         hx-include=\"#manage-q, #booklist input[name=page]\" hx-target=\"this\" hx-swap=\"innerHTML\">{table}</div>\n{script}",
        title = e(text(l, "title")),
        subtitle = e(text(l, "subtitle")),
        search = e(text(l, "search")),
        q = e(query),
        bulk = crate::books_bulk::bar(l, editor.can_delete()),
        script = SELECTION_SCRIPT,
    );
    // htmx sends the CSRF token on every request from `<body hx-headers>`; the plain layout puts it there.
    auth_page::layout_htmx(
        &editor.settings.title,
        l,
        text(l, "title"),
        &body,
        &editor.name,
        csrf,
        editor.access.role & ROLE_ADMIN != 0,
    )
}

/// Select-all and the counter of ticked rows; the rest of the page is htmx.
const SELECTION_SCRIPT: &str = "<script>\n(() => {\n  const count = () => { document.getElementById('bulk-count').textContent = document.querySelectorAll('#booklist input[name=ids]:checked').length; };\n  document.addEventListener('change', e => {\n    if (e.target.id === 'select-all') document.querySelectorAll('#booklist input[name=ids]').forEach(c => { c.checked = e.target.checked; });\n    if (e.target.id === 'select-all' || e.target.name === 'ids') count();\n  });\n  document.body.addEventListener('htmx:afterSwap', e => { if (e.target.id === 'booklist') count(); });\n})();\n</script>\n";
