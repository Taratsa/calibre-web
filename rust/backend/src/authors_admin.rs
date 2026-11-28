//! `/admin/authors`: rename or merge an author across every book, for an administrator.
//!
//! Three steps, all server-rendered with no script: the form, a preview that says what would change (mode, number of
//! books, a sample of titles) and carries the previewed count, and the run, which refuses when the count changed in
//! between (`authors::apply`), writes ONE transaction after a `VACUUM INTO` backup, and records an audit entry.
//! Identity and CSRF are the session cookie Flask verifies (`session::identify`, `session::csrf_matches`), the same
//! way `/me/2fa` does it; the role check is Flask's `ROLE_ADMIN` bit.

use crate::authors::{self, Mode, NameError, Plan, PlanError};
use crate::download::escape_html as e;
use crate::twofa::{client_ip, csrf_ok, locale, now, page, parse_form, redirect};
use crate::{AppState, auth_page, authdb, session};
use axum::Router;
use axum::body::Bytes;
use axum::extract::{Query, State};
use axum::http::{HeaderMap, StatusCode};
use axum::response::Response;
use axum::routing::{get, post};
use std::collections::HashMap;
use std::sync::Arc;

const ROLE_ADMIN: i64 = 1;
/// Titles listed in the preview.
const SAMPLE: usize = 15;

pub fn routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/admin/authors", get(form))
        .route("/admin/authors/preview", post(preview))
        .route("/admin/authors/run", post(run))
}

struct Admin {
    settings: crate::settings::Settings,
    id: i64,
    name: String,
    secret: Vec<u8>,
    locale: &'static str,
}

/// The signed-in administrator, or the response to send instead (login redirect, or 403 for anyone else).
async fn admin(state: &Arc<AppState>, headers: &HeaderMap) -> Result<Admin, Box<Response>> {
    let to_login = || Box::new(redirect("/login?next=%2Fadmin%2Fauthors", None));
    let settings = state.settings().await.map_err(|_| to_login())?;
    let secret = state.secret(&settings);
    let locale = locale(headers);
    let access = match session::identify(state, &settings, headers).await {
        Ok(session::Who::User(access)) => access,
        _ => return Err(to_login()),
    };
    let user_id = access.id;
    let app_db = state.app_db.clone();
    let name = tokio::task::spawn_blocking(move || authdb::user_name(&app_db, user_id))
        .await
        .ok()
        .and_then(Result::ok)
        .flatten()
        .ok_or_else(to_login)?;
    if access.role & ROLE_ADMIN == 0 {
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
    Ok(Admin {
        settings: (*settings).clone(),
        id: access.id,
        name,
        secret,
        locale,
    })
}

fn text(locale: &str, key: &str) -> &'static str {
    let english = locale.starts_with("en");
    match (key, english) {
        ("title", true) => "Rename author",
        ("title", false) => "Ganti nama penulis",
        ("help", true) => {
            "Changes the author in every book at once. If the new name already exists, the two authors are merged. \
             Book folders are not renamed; the catalogue records where each book is stored."
        }
        ("help", false) => {
            "Mengganti penulis di semua buku sekaligus. Jika nama baru sudah ada, kedua penulis digabung. Folder \
             buku tidak diganti namanya; katalog mencatat letak tiap buku."
        }
        ("old", true) => "Current name",
        ("old", false) => "Nama saat ini",
        ("new", true) => "New name",
        ("new", false) => "Nama baru",
        ("preview", true) => "Preview",
        ("preview", false) => "Pratinjau",
        ("confirm", true) => "Apply the change",
        ("confirm", false) => "Terapkan perubahan",
        ("cancel", true) => "Cancel",
        ("cancel", false) => "Batal",
        ("again", true) => "Rename another author",
        ("again", false) => "Ganti penulis lain",
        ("home", true) => "Home",
        ("home", false) => "Beranda",
        ("forbidden", true) => "Only administrators can change authors.",
        ("forbidden", false) => "Hanya administrator yang dapat mengubah penulis.",
        ("csrf", true) => "The form expired. Reload the page and try again.",
        ("csrf", false) => "Formulir kedaluwarsa. Muat ulang halaman dan coba lagi.",
        ("stale", true) => "The library changed after the preview. Preview again.",
        ("stale", false) => "Pustaka berubah setelah pratinjau. Lakukan pratinjau lagi.",
        ("not_found", true) => "No author has that name.",
        ("not_found", false) => "Tidak ada penulis dengan nama itu.",
        ("unchanged", true) => "The new name is the same as the current one.",
        ("unchanged", false) => "Nama baru sama dengan nama saat ini.",
        ("empty", true) => "Enter both names.",
        ("empty", false) => "Isi kedua nama.",
        ("several", true) => {
            "A name cannot contain \"&\": that would be two authors. Rename one author at a time."
        }
        ("several", false) => {
            "Nama tidak boleh memuat \"&\": itu berarti dua penulis. Ganti satu penulis setiap kali."
        }
        ("db", true) => "The catalogue could not be changed. Nothing was written.",
        ("db", false) => "Katalog tidak dapat diubah. Tidak ada yang ditulis.",
        _ => "",
    }
}

fn plan_error(locale: &str, error: &PlanError) -> &'static str {
    match error {
        PlanError::Name(NameError::Empty) => text(locale, "empty"),
        PlanError::Name(NameError::Several) => text(locale, "several"),
        PlanError::NotFound => text(locale, "not_found"),
        PlanError::Unchanged => text(locale, "unchanged"),
        PlanError::Db(_) => text(locale, "db"),
    }
}

fn csrf_value(admin: &Admin, headers: &HeaderMap) -> String {
    let at = now();
    session::session_csrf(headers, &admin.secret, at)
        .ok()
        .flatten()
        .map(|value| session::csrf_token(&admin.secret, &value, at))
        .unwrap_or_default()
}

fn render(admin: &Admin, body: &str) -> String {
    auth_page::layout(
        &admin.settings.title,
        admin.locale,
        text(admin.locale, "title"),
        body,
        None,
        Some(&admin.name),
    )
}

/// Stored names write `,` as `|`; people read and type commas.
fn shown(name: &str) -> String {
    name.replace('|', ",")
}

fn form_html(admin: &Admin, csrf: &str, old: &str, new: &str, error: Option<&str>) -> String {
    let l = admin.locale;
    let error = error
        .map(|message| {
            format!(
                "<p class=\"flash flash-error\" role=\"alert\">{}</p>\n",
                e(message)
            )
        })
        .unwrap_or_default();
    format!(
        "{error}<h1 class=\"plain-title\">{title}</h1>\n<section class=\"plain-section\">\n  <p class=\"plain-muted\">{help}</p>\n  \
         <form method=\"post\" action=\"/admin/authors/preview\">\n    \
         <input type=\"hidden\" name=\"csrf_token\" value=\"{csrf}\">\n    \
         <label for=\"old\">{old_label}</label>\n    \
         <input id=\"old\" name=\"old\" type=\"text\" value=\"{old}\" required>\n    \
         <label for=\"new\">{new_label}</label>\n    \
         <input id=\"new\" name=\"new\" type=\"text\" value=\"{new}\" required>\n    \
         <div class=\"plain-actions\"><button type=\"submit\">{preview}</button></div>\n  </form>\n</section>\n",
        title = e(text(l, "title")),
        help = e(text(l, "help")),
        csrf = e(csrf),
        old_label = e(text(l, "old")),
        new_label = e(text(l, "new")),
        old = e(old),
        new = e(new),
        preview = e(text(l, "preview")),
    )
}

async fn form(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Query(query): Query<HashMap<String, String>>,
) -> Response {
    let admin = match admin(&state, &headers).await {
        Ok(admin) => admin,
        Err(response) => return *response,
    };
    let csrf = csrf_value(&admin, &headers);
    let old = query.get("old").map_or("", String::as_str);
    let body = form_html(&admin, &csrf, old, "", None);
    page(render(&admin, &body), StatusCode::OK)
}

fn open_plan(
    state: &AppState,
    settings: &crate::settings::Settings,
    old: &str,
    new: &str,
) -> Result<Plan, PlanError> {
    let _ = state;
    let conn = authors::open_library(
        &settings.metadata_db(),
        Some(crate::bookedit::title_regex(&state.app_db)),
    )
    .map_err(|e| PlanError::Db(e.to_string()))?;
    authors::plan(&conn, old, new)
}

async fn plan_blocking(
    state: &Arc<AppState>,
    admin: &Admin,
    old: &str,
    new: &str,
) -> Result<Plan, PlanError> {
    let settings = admin.settings.clone();
    let (state, old, new) = (state.clone(), old.to_owned(), new.to_owned());
    tokio::task::spawn_blocking(move || open_plan(&state, &settings, &old, &new))
        .await
        .map_err(|error| PlanError::Db(error.to_string()))?
}

fn stale_or_csrf(admin: &Admin, message: &'static str) -> Response {
    page(
        auth_page::notice_page(
            &admin.settings.title,
            admin.locale,
            text(admin.locale, "title"),
            message,
            Some(("/admin/authors", text(admin.locale, "again"))),
        ),
        StatusCode::BAD_REQUEST,
    )
}

async fn preview(State(state): State<Arc<AppState>>, headers: HeaderMap, body: Bytes) -> Response {
    let admin = match admin(&state, &headers).await {
        Ok(admin) => admin,
        Err(response) => return *response,
    };
    let form = parse_form(&String::from_utf8_lossy(&body));
    if !csrf_ok(&state, &headers, &form, &admin.secret, now()).await {
        return stale_or_csrf(&admin, text(admin.locale, "csrf"));
    }
    let get = |name: &str| {
        form.iter()
            .rev()
            .find(|(key, _)| key == name)
            .map_or("", |(_, value)| value.as_str())
            .to_owned()
    };
    let (old, new) = (get("old"), get("new"));
    let csrf = csrf_value(&admin, &headers);
    let plan = match plan_blocking(&state, &admin, &old, &new).await {
        Ok(plan) => plan,
        Err(error) => {
            if let PlanError::Db(detail) = &error {
                tracing::error!("author preview failed: {detail}");
            }
            let body = form_html(
                &admin,
                &csrf,
                &old,
                &new,
                Some(plan_error(admin.locale, &error)),
            );
            return page(render(&admin, &body), StatusCode::UNPROCESSABLE_ENTITY);
        }
    };
    page(
        render(&admin, &preview_html(&admin, &csrf, &old, &new, &plan)),
        StatusCode::OK,
    )
}

fn preview_html(admin: &Admin, csrf: &str, old: &str, new: &str, plan: &Plan) -> String {
    let english = admin.locale.starts_with("en");
    let (old_name, new_name) = (shown(&plan.old_name), shown(&plan.new_name));
    let summary = match (plan.mode, english) {
        (Mode::Rename, true) => format!(
            "Rename \"{old_name}\" to \"{new_name}\" in {} books.",
            plan.books.len()
        ),
        (Mode::Rename, false) => format!(
            "Ganti \"{old_name}\" menjadi \"{new_name}\" di {} buku.",
            plan.books.len()
        ),
        (Mode::CaseOnly, true) => format!(
            "Change the capitalisation of \"{old_name}\" to \"{new_name}\" ({} books).",
            plan.books.len()
        ),
        (Mode::CaseOnly, false) => format!(
            "Ubah huruf besar/kecil \"{old_name}\" menjadi \"{new_name}\" ({} buku).",
            plan.books.len()
        ),
        (Mode::Merge, true) => format!(
            "\"{new_name}\" already exists. Merge \"{old_name}\" into it: {} books move, and \"{old_name}\" is removed.",
            plan.books.len()
        ),
        (Mode::Merge, false) => format!(
            "\"{new_name}\" sudah ada. Gabungkan \"{old_name}\" ke dalamnya: {} buku dipindahkan dan \"{old_name}\" dihapus.",
            plan.books.len()
        ),
    };
    let sample: String = plan
        .books
        .iter()
        .take(SAMPLE)
        .map(|book| format!("<li>{}</li>", e(&book.title)))
        .collect();
    let more = plan.books.len().saturating_sub(SAMPLE);
    let more = if more > 0 {
        format!(
            "<p class=\"plain-muted\">{}</p>",
            if english {
                format!("and {more} more")
            } else {
                format!("dan {more} lainnya")
            }
        )
    } else {
        String::new()
    };
    let l = admin.locale;
    format!(
        "<h1 class=\"plain-title\">{title}</h1>\n<section class=\"plain-section\">\n  <p><strong>{summary}</strong></p>\n  \
         <ul>{sample}</ul>\n  {more}\n  \
         <form method=\"post\" action=\"/admin/authors/run\">\n    \
         <input type=\"hidden\" name=\"csrf_token\" value=\"{csrf}\">\n    \
         <input type=\"hidden\" name=\"old\" value=\"{old}\">\n    \
         <input type=\"hidden\" name=\"new\" value=\"{new}\">\n    \
         <input type=\"hidden\" name=\"expected\" value=\"{count}\">\n    \
         <input type=\"hidden\" name=\"confirm\" value=\"yes\">\n    \
         <div class=\"plain-actions\"><button type=\"submit\" class=\"plain-danger\">{confirm}</button> \
         <a href=\"/admin/authors\">{cancel}</a></div>\n  </form>\n</section>\n",
        title = e(text(l, "title")),
        summary = e(&summary),
        csrf = e(csrf),
        old = e(old),
        new = e(new),
        count = plan.books.len(),
        confirm = e(text(l, "confirm")),
        cancel = e(text(l, "cancel")),
    )
}

async fn run(State(state): State<Arc<AppState>>, headers: HeaderMap, body: Bytes) -> Response {
    let admin = match admin(&state, &headers).await {
        Ok(admin) => admin,
        Err(response) => return *response,
    };
    let form = parse_form(&String::from_utf8_lossy(&body));
    if !csrf_ok(&state, &headers, &form, &admin.secret, now()).await {
        return stale_or_csrf(&admin, text(admin.locale, "csrf"));
    }
    let get = |name: &str| {
        form.iter()
            .rev()
            .find(|(key, _)| key == name)
            .map_or("", |(_, value)| value.as_str())
            .to_owned()
    };
    // A bare POST must never change data: only the preview's form carries `confirm=yes` and the previewed count.
    let expected: Option<usize> = get("expected").parse().ok();
    let (old, new) = (get("old"), get("new"));
    let Some(expected) = expected.filter(|_| get("confirm") == "yes") else {
        return stale_or_csrf(&admin, text(admin.locale, "stale"));
    };

    let settings = admin.settings.clone();
    let backup_dir = state
        .app_db
        .parent()
        .map(|dir| dir.join("processed_books").join("author_renames"));
    let (job_old, job_new, app_db_path) = (old.clone(), new.clone(), state.app_db.clone());
    let outcome = tokio::task::spawn_blocking(move || {
        let mut conn = authors::open_library(
            &settings.metadata_db(),
            Some(crate::bookedit::title_regex(&app_db_path)),
        )
        .map_err(|e| e.to_string())?;
        authors::apply(
            &mut conn,
            &job_old,
            &job_new,
            expected,
            backup_dir.as_deref(),
        )
    })
    .await;
    let csrf = csrf_value(&admin, &headers);
    let applied = match outcome {
        Ok(Ok(applied)) => applied,
        Ok(Err(message)) => {
            tracing::error!("author rename {old:?} -> {new:?} failed: {message}");
            let text_key = if message.contains("changed since the preview") {
                "stale"
            } else {
                "db"
            };
            let body = form_html(
                &admin,
                &csrf,
                &old,
                &new,
                Some(text(admin.locale, text_key)),
            );
            return page(render(&admin, &body), StatusCode::CONFLICT);
        }
        Err(error) => {
            tracing::error!("author rename task failed: {error}");
            let body = form_html(&admin, &csrf, &old, &new, Some(text(admin.locale, "db")));
            return page(render(&admin, &body), StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    let details = format!(
        "{} -> {} ({:?}, {} books{})",
        shown(&old.trim().replace(',', "|")),
        shown(&applied.new_name),
        applied.mode,
        applied.books,
        applied
            .backup
            .as_ref()
            .map(|path| format!(", backup {}", path.display()))
            .unwrap_or_default()
    );
    let (app_db, id, ip) = (state.app_db.clone(), admin.id, client_ip(&headers));
    let _ = tokio::task::spawn_blocking(move || {
        authdb::audit_resource(&app_db, id, "author_rename", "author", None, &details, &ip);
    })
    .await;
    tracing::info!(
        "author renamed by user {}: {old:?} -> {new:?}, {} books ({:?})",
        admin.id,
        applied.books,
        applied.mode
    );

    let english = admin.locale.starts_with("en");
    let message = if english {
        format!(
            "Done: {} books now list \"{}\". The public site follows after the next automatic rebuild.",
            applied.books,
            shown(&applied.new_name)
        )
    } else {
        format!(
            "Selesai: {} buku kini memuat \"{}\". Situs publik mengikuti setelah pembangunan ulang otomatis berikutnya.",
            applied.books,
            shown(&applied.new_name)
        )
    };
    let body = format!(
        "<p class=\"flash flash-success\" role=\"status\">{}</p>\n<p><a href=\"/admin/authors\">{}</a></p>\n",
        e(&message),
        e(text(admin.locale, "again"))
    );
    page(render(&admin, &body), StatusCode::OK)
}
