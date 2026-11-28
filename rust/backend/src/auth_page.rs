//! The HTML of the login and second-factor pages. Rust renders them so the whole auth flow (password, Turnstile, TOTP,
//! recovery codes, enrolment) runs in one process; Flask keeps every page that needs a logged-in user.
//!
//! The markup reuses `cps/static/plain.css` (the plain UI's one stylesheet) and the same header/footer as
//! `plain_layout.html`, so the login looks like the rest of the admin surface. Strings are Indonesian with English as
//! the fallback for `Accept-Language`, matching the public site's language.

use crate::reader::escape_html;

/// One page's labels. Indonesian is the site's language; English exists for an `en` browser.
pub struct Strings {
    pub login: &'static str,
    pub username: &'static str,
    pub password: &'static str,
    pub remember: &'static str,
    pub submit: &'static str,
    pub forgot: &'static str,
    pub home: &'static str,
    pub wrong: &'static str,
    pub rate_limited: &'static str,
    pub bot_failed: &'static str,
    pub csrf_failed: &'static str,
    pub twofa_title: &'static str,
    pub twofa_heading: &'static str,
    pub code: &'static str,
    pub code_help: &'static str,
    pub recovery: &'static str,
    pub recovery_help: &'static str,
    pub use_recovery: &'static str,
    pub verify: &'static str,
    pub invalid_code: &'static str,
    pub expired: &'static str,
    pub back_to_login: &'static str,
    pub security: &'static str,
    pub security_heading: &'static str,
    pub enabled: &'static str,
    pub disabled: &'static str,
    pub enable: &'static str,
    pub enable_help: &'static str,
    pub scan: &'static str,
    pub secret_key: &'static str,
    pub confirm: &'static str,
    pub recovery_saved: &'static str,
    pub recovery_once: &'static str,
    pub disable: &'static str,
    pub disable_help: &'static str,
    pub profile: &'static str,
    pub not_allowed: &'static str,
    pub done: &'static str,
}

static ID: Strings = Strings {
    login: "Masuk",
    username: "Nama pengguna",
    password: "Kata sandi",
    remember: "Ingat saya",
    submit: "Masuk",
    forgot: "Lupa kata sandi?",
    home: "Beranda",
    wrong: "Nama pengguna atau kata sandi salah",
    rate_limited: "Terlalu banyak percobaan. Coba lagi dalam %s detik.",
    bot_failed: "Verifikasi bot gagal. Muat ulang halaman lalu coba lagi.",
    csrf_failed: "Sesi formulir kedaluwarsa. Muat ulang halaman lalu coba lagi.",
    twofa_title: "Verifikasi dua langkah",
    twofa_heading: "Masukkan kode verifikasi",
    code: "Kode 6 digit",
    code_help: "Kode dari aplikasi autentikator (Google Authenticator, Aegis, 1Password, dan sejenisnya).",
    recovery: "Kode pemulihan",
    recovery_help: "Satu kode pemulihan hanya bisa dipakai sekali.",
    use_recovery: "Gunakan kode pemulihan",
    verify: "Verifikasi",
    invalid_code: "Kode tidak valid",
    expired: "Sesi verifikasi kedaluwarsa.",
    back_to_login: "Kembali ke halaman masuk",
    security: "Keamanan akun",
    security_heading: "Verifikasi dua langkah (2FA)",
    enabled: "Aktif",
    disabled: "Tidak aktif",
    enable: "Aktifkan 2FA",
    enable_help: "Setelah aktif, masuk ke akun ini memerlukan kode dari aplikasi autentikator.",
    scan: "Pindai kode QR ini dengan aplikasi autentikator, lalu masukkan kode 6 digit yang tampil.",
    secret_key: "Atau masukkan kunci ini secara manual",
    confirm: "Konfirmasi",
    recovery_saved: "Simpan kode pemulihan ini di tempat aman.",
    recovery_once: "Kode ini hanya ditampilkan sekali dan tidak bisa dilihat lagi. Setiap kode bisa dipakai sekali.",
    disable: "Nonaktifkan 2FA",
    disable_help: "Masukkan kode yang sedang tampil di aplikasi autentikator untuk mengonfirmasi.",
    profile: "Profil",
    not_allowed: "Akun ini tidak boleh mengubah pengaturan keamanan.",
    done: "Tersimpan.",
};

static EN: Strings = Strings {
    login: "Login",
    username: "Username",
    password: "Password",
    remember: "Remember me",
    submit: "Login",
    forgot: "Forgot password?",
    home: "Home",
    wrong: "Wrong username or password",
    rate_limited: "Too many attempts. Try again in %s seconds.",
    bot_failed: "The bot check failed. Reload the page and try again.",
    csrf_failed: "The form session expired. Reload the page and try again.",
    twofa_title: "Two-step verification",
    twofa_heading: "Enter your verification code",
    code: "6-digit code",
    code_help: "The code from your authenticator app (Google Authenticator, Aegis, 1Password, …).",
    recovery: "Recovery code",
    recovery_help: "Each recovery code can be used once.",
    use_recovery: "Use a recovery code",
    verify: "Verify",
    invalid_code: "Invalid code",
    expired: "The verification session expired.",
    back_to_login: "Back to the login page",
    security: "Account security",
    security_heading: "Two-step verification (2FA)",
    enabled: "Enabled",
    disabled: "Disabled",
    enable: "Enable 2FA",
    enable_help: "Once enabled, signing in to this account needs a code from your authenticator app.",
    scan: "Scan this QR code with your authenticator app, then enter the 6-digit code it shows.",
    secret_key: "Or enter this key manually",
    confirm: "Confirm",
    recovery_saved: "Store these recovery codes somewhere safe.",
    recovery_once: "They are shown once and cannot be viewed again. Each code works once.",
    disable: "Disable 2FA",
    disable_help: "Enter the code currently shown in your authenticator app to confirm.",
    profile: "Profile",
    not_allowed: "This account may not change its security settings.",
    done: "Saved.",
};

pub fn strings(locale: &str) -> &'static Strings {
    if locale.starts_with("en") { &EN } else { &ID }
}

fn e(value: &str) -> String {
    escape_html(value)
}

/// The page shell: the plain UI's header, footer and stylesheet, plus an optional Turnstile script.
pub fn layout(
    instance: &str,
    locale: &str,
    title: &str,
    body: &str,
    turnstile_site_key: Option<&str>,
    nav_user: Option<&str>,
) -> String {
    let strings = strings(locale);
    let turnstile = match turnstile_site_key {
        Some(site_key) => format!(
            "\n  <script src=\"https://challenges.cloudflare.com/turnstile/v0/api.js\" async defer></script>\n  <meta name=\"cf-sitekey\" content=\"{}\">",
            e(site_key)
        ),
        None => String::new(),
    };
    let account = match nav_user {
        Some(name) => format!(
            "<a href=\"/me\">{}</a><a href=\"/logout\">{}</a>",
            e(name),
            e(if locale.starts_with("en") {
                "Logout"
            } else {
                "Keluar"
            })
        ),
        None => format!("<a href=\"/\">{}</a>", e(strings.home)),
    };
    format!(
        "<!doctype html>\n<html lang=\"{lang}\">\n<head>\n  <meta charset=\"utf-8\">\n  \
         <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n  \
         <meta name=\"color-scheme\" content=\"light dark\">\n  \
         <meta name=\"robots\" content=\"noindex\">\n  \
         <title>{instance} | {title}</title>\n  \
         <link rel=\"icon\" type=\"image/png\" href=\"/static/favicon.png\">\n  \
         <link rel=\"stylesheet\" href=\"/static/plain.css\">{turnstile}\n</head>\n<body>\n  \
         <header class=\"plain-header\">\n    \
         <a class=\"plain-brand\" href=\"/\"><img src=\"/static/logo-taratsa.png\" alt=\"\"><span>{instance}</span></a>\n    \
         <nav class=\"plain-nav\" aria-label=\"Main navigation\">{account}</nav>\n  </header>\n  \
         <main class=\"plain-wrap\">\n    <div class=\"plain-page\">\n{body}\n    </div>\n    \
         <footer class=\"plain-footer\">{instance}</footer>\n  </main>\n</body>\n</html>\n",
        lang = if locale.starts_with("en") { "en" } else { "id" },
        instance = e(instance),
        title = e(title),
        turnstile = turnstile,
        account = account,
        body = body,
    )
}

/// The shell for the staff pages Rust serves with htmx (the book manager): the plain UI's header with the links an
/// administrator or editor sees, the vendored htmx script, and the CSRF token on `<body hx-headers>` so every htmx
/// request carries it (Flask-WTF reads the `X-CSRFToken` header).
pub fn layout_htmx(
    instance: &str,
    locale: &str,
    title: &str,
    body: &str,
    user: &str,
    csrf: &str,
    is_admin: bool,
) -> String {
    let english = locale.starts_with("en");
    let label = |en: &'static str, id: &'static str| e(if english { en } else { id });
    let admin = if is_admin {
        format!("<a href=\"/admin/view\">{}</a>", label("Admin", "Admin"))
    } else {
        String::new()
    };
    let account = format!(
        "<a href=\"/search/\">{adv}</a><a href=\"/tasks\">{tasks}</a>{admin}<a href=\"/admin/books\">{manage}</a>\
         <a href=\"/me\">{user}</a><a href=\"/logout\">{logout}</a>",
        adv = label("Search", "Cari"),
        tasks = label("Tasks", "Tugas"),
        manage = label("Manage Books", "Kelola Buku"),
        user = e(user),
        logout = label("Logout", "Keluar"),
    );
    let token = serde_json::json!({ "X-CSRFToken": csrf }).to_string();
    format!(
        "<!doctype html>\n<html lang=\"{lang}\">\n<head>\n  <meta charset=\"utf-8\">\n  \
         <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n  \
         <meta name=\"color-scheme\" content=\"light dark\">\n  <meta name=\"robots\" content=\"noindex\">\n  \
         <title>{instance} | {title}</title>\n  \
         <link rel=\"icon\" type=\"image/png\" href=\"/static/favicon.png\">\n  \
         <link rel=\"stylesheet\" href=\"/static/plain.css\">\n  \
         <script defer src=\"/static/js/libs/htmx.min.js\"></script>\n</head>\n<body hx-headers='{token}'>\n  \
         <header class=\"plain-header\">\n    \
         <a class=\"plain-brand\" href=\"/\"><img src=\"/static/logo-taratsa.png\" alt=\"\"><span>{instance}</span></a>\n    \
         <nav class=\"plain-nav\" aria-label=\"Main navigation\">{account}</nav>\n  </header>\n  \
         <main class=\"plain-wrap\">\n    <div class=\"plain-page\">\n{body}\n    </div>\n    \
         <footer class=\"plain-footer\">{instance}</footer>\n  </main>\n</body>\n</html>\n",
        lang = if english { "en" } else { "id" },
        instance = e(instance),
        title = e(title),
        token = token.replace('\'', "&#39;"),
        account = account,
        body = body,
    )
}

/// One flash-style message block, Flask's `flash flash-error` markup.
fn flash(message: &str) -> String {
    format!(
        "<p class=\"flash flash-error\" role=\"alert\">{}</p>\n",
        e(message)
    )
}

pub struct LoginPage<'a> {
    pub instance: &'a str,
    pub locale: &'a str,
    pub next: &'a str,
    pub username: &'a str,
    pub csrf: &'a str,
    pub error: Option<&'a str>,
    pub turnstile_site_key: Option<&'a str>,
    pub mail_configured: bool,
    pub remote_login: bool,
}

/// `GET /login`: the same fields Flask's `plain_login.html` posts.
pub fn login_page(page: LoginPage<'_>) -> String {
    let s = strings(page.locale);
    let widget = match page.turnstile_site_key {
        Some(site_key) => format!(
            "<div class=\"cf-turnstile\" data-sitekey=\"{}\" data-theme=\"auto\"></div>\n",
            e(site_key)
        ),
        None => String::new(),
    };
    let forgot = if page.mail_configured {
        format!(
            "<button type=\"submit\" name=\"forgot\" value=\"forgot\">{}</button>\n",
            e(s.forgot)
        )
    } else {
        String::new()
    };
    let magic = if page.remote_login {
        format!(
            "<p><a href=\"/remote/login\">{}</a></p>\n",
            e(if page.locale.starts_with("en") {
                "Log in with a magic link"
            } else {
                "Masuk dengan tautan ajaib"
            })
        )
    } else {
        String::new()
    };
    let body = format!(
        "<section class=\"plain-login\">\n  <h1>{login}</h1>\n  \
         <form method=\"post\" action=\"/login\">\n    \
         <input type=\"hidden\" name=\"csrf_token\" value=\"{csrf}\">\n    \
         <input type=\"hidden\" name=\"next\" value=\"{next}\">\n    \
         <label for=\"username\">{username}</label>\n    \
         <input id=\"username\" name=\"username\" type=\"text\" autocomplete=\"username\" autocapitalize=\"off\" value=\"{value}\" required autofocus>\n    \
         <label for=\"password\">{password}</label>\n    \
         <input id=\"password\" name=\"password\" type=\"password\" autocomplete=\"current-password\" required>\n    \
         <p><label class=\"plain-inline\"><input type=\"checkbox\" name=\"remember_me\" checked> {remember}</label></p>\n    \
         {widget}    <div class=\"plain-actions\">\n      \
         <button type=\"submit\" name=\"submit\" value=\"login\">{submit}</button>\n      {forgot}</div>\n  </form>\n  \
         {magic}  {error}</section>\n",
        login = e(s.login),
        csrf = e(page.csrf),
        next = e(page.next),
        username = e(s.username),
        password = e(s.password),
        value = e(page.username),
        remember = e(s.remember),
        widget = widget,
        submit = e(s.submit),
        forgot = forgot,
        magic = magic,
        error = page.error.map(flash).unwrap_or_default(),
    );
    layout(
        page.instance,
        page.locale,
        s.login,
        &body,
        page.turnstile_site_key,
        None,
    )
}

pub struct CodePage<'a> {
    pub instance: &'a str,
    pub locale: &'a str,
    pub csrf: &'a str,
    pub error: Option<&'a str>,
    pub recovery: bool,
}

/// `GET /login/2fa`: one input, labelled as the TOTP code or as a recovery code.
pub fn code_page(page: CodePage<'_>) -> String {
    let s = strings(page.locale);
    let (label, help, field, autocomplete) = if page.recovery {
        (
            s.recovery,
            s.recovery_help,
            "recovery_code",
            "one-time-code",
        )
    } else {
        (s.code, s.code_help, "code", "one-time-code")
    };
    let body = format!(
        "<section class=\"plain-login\">\n  <h1>{heading}</h1>\n  \
         <p class=\"plain-muted\">{help}</p>\n  \
         <form method=\"post\" action=\"/login/2fa\">\n    \
         <input type=\"hidden\" name=\"csrf_token\" value=\"{csrf}\">\n    \
         <label for=\"code\">{label}</label>\n    \
         <input id=\"code\" name=\"{field}\" type=\"text\" inputmode=\"numeric\" autocomplete=\"{autocomplete}\" \
         autocapitalize=\"off\" spellcheck=\"false\" required autofocus>\n    \
         <div class=\"plain-actions\">\n      <button type=\"submit\">{verify}</button>\n    </div>\n  </form>\n  \
         {error}</section>\n",
        heading = e(s.twofa_heading),
        help = e(help),
        csrf = e(page.csrf),
        label = e(label),
        field = field,
        autocomplete = autocomplete,
        verify = e(s.verify),
        error = page.error.map(flash).unwrap_or_default(),
    );
    layout(page.instance, page.locale, s.twofa_title, &body, None, None)
}

/// The security page of a logged-in account: status, the enrolment QR, or the disable form.
pub struct SecurityPage<'a> {
    pub instance: &'a str,
    pub locale: &'a str,
    pub user: &'a str,
    pub csrf: &'a str,
    pub message: Option<&'a str>,
    pub error: Option<&'a str>,
    /// `None` = no second factor yet, so offer the button that starts enrolment.
    pub enabled: bool,
    /// `Some((qr_data_uri, secret_base32))` while an enrolment is pending.
    pub pending: Option<(String, String)>,
}

pub fn security_page(page: SecurityPage<'_>) -> String {
    let s = strings(page.locale);
    let status = if page.enabled { s.enabled } else { s.disabled };
    let mut body = format!(
        "<h1 class=\"plain-title\">{heading}</h1>\n<section class=\"plain-section\">\n  \
         <p><strong>{user}</strong>: {status}</p>\n",
        heading = e(s.security_heading),
        user = e(page.user),
        status = e(status),
    );
    if page.enabled {
        body.push_str(&format!(
            "  <h2>{disable}</h2>\n  <p class=\"plain-muted\">{help}</p>\n  \
             <form method=\"post\" action=\"/me/2fa/disable\">\n    \
             <input type=\"hidden\" name=\"csrf_token\" value=\"{csrf}\">\n    \
             <label for=\"code\">{code}</label>\n    \
             <input id=\"code\" name=\"code\" type=\"text\" inputmode=\"numeric\" autocomplete=\"one-time-code\" required>\n    \
             <div class=\"plain-actions\"><button type=\"submit\" class=\"plain-danger\">{disable}</button></div>\n  </form>\n",
            disable = e(s.disable),
            help = e(s.disable_help),
            csrf = e(page.csrf),
            code = e(s.code),
        ));
    } else if let Some((qr, secret)) = &page.pending {
        body.push_str(&format!(
            "  <h2>{enable}</h2>\n  <p>{scan}</p>\n  \
             <p><img src=\"{qr}\" alt=\"QR code\" width=\"220\" height=\"220\"></p>\n  \
             <p class=\"plain-muted\">{label}: <code>{secret}</code></p>\n  \
             <form method=\"post\" action=\"/me/2fa/confirm\">\n    \
             <input type=\"hidden\" name=\"csrf_token\" value=\"{csrf}\">\n    \
             <label for=\"code\">{code}</label>\n    \
             <input id=\"code\" name=\"code\" type=\"text\" inputmode=\"numeric\" autocomplete=\"one-time-code\" required>\n    \
             <div class=\"plain-actions\"><button type=\"submit\">{confirm}</button></div>\n  </form>\n",
            enable = e(s.enable),
            scan = e(s.scan),
            qr = e(qr),
            label = e(s.secret_key),
            secret = e(secret),
            csrf = e(page.csrf),
            code = e(s.code),
            confirm = e(s.confirm),
        ));
    } else {
        body.push_str(&format!(
            "  <h2>{enable}</h2>\n  <p class=\"plain-muted\">{help}</p>\n  \
             <form method=\"post\" action=\"/me/2fa/start\">\n    \
             <input type=\"hidden\" name=\"csrf_token\" value=\"{csrf}\">\n    \
             <div class=\"plain-actions\"><button type=\"submit\">{enable}</button></div>\n  </form>\n",
            enable = e(s.enable),
            help = e(s.enable_help),
            csrf = e(page.csrf),
        ));
    }
    body.push_str(&format!(
        "</section>\n<p><a href=\"/me\">{profile}</a></p>\n",
        profile = e(s.profile)
    ));
    let message = page
        .message
        .map(|text| format!("<p class=\"flash flash-success\">{}</p>\n", e(text)))
        .unwrap_or_default();
    let body = format!("{message}{body}");
    layout(
        page.instance,
        page.locale,
        s.security,
        &body,
        None,
        Some(page.user),
    )
}

/// The recovery codes, shown exactly once after enrolment.
pub fn recovery_page(instance: &str, locale: &str, user: &str, codes: &[String]) -> String {
    let s = strings(locale);
    let items: String = codes
        .iter()
        .map(|code| format!("<li><code>{}</code></li>\n", e(code)))
        .collect();
    let body = format!(
        "<h1 class=\"plain-title\">{heading}</h1>\n<section class=\"plain-section\">\n  \
         <h2>{saved}</h2>\n  <p class=\"plain-muted\">{once}</p>\n  \
         <ul class=\"plain-recovery\">\n{items}  </ul>\n</section>\n\
         <p><a href=\"/me/2fa\">{security}</a> · <a href=\"/me\">{profile}</a></p>\n",
        heading = e(s.security_heading),
        saved = e(s.recovery_saved),
        once = e(s.recovery_once),
        items = items,
        security = e(s.security),
        profile = e(s.profile),
    );
    layout(instance, locale, s.security, &body, None, Some(user))
}

/// A short page for "you must log in", an expired verification, or a refused account.
pub fn notice_page(
    instance: &str,
    locale: &str,
    title: &str,
    message: &str,
    link: Option<(&str, &str)>,
) -> String {
    let s = strings(locale);
    let link = link
        .map(|(href, label)| format!("<p><a href=\"{}\">{}</a></p>\n", e(href), e(label)))
        .unwrap_or_else(|| format!("<p><a href=\"/\">{}</a></p>\n", e(s.home)));
    let body = format!(
        "<section class=\"plain-section\">\n  <h1 class=\"plain-title\">{}</h1>\n  <p>{}</p>\n  {}</section>\n",
        e(title),
        e(message),
        link
    );
    layout(instance, locale, title, &body, None, None)
}

#[cfg(test)]
mod tests {
    use super::{CodePage, LoginPage, SecurityPage, code_page, login_page, security_page, strings};

    fn login(error: Option<&'static str>) -> String {
        login_page(LoginPage {
            instance: "Pustaka",
            locale: "id",
            next: "/admin/view",
            username: "admin\"<script>",
            csrf: "token",
            error,
            turnstile_site_key: Some("0xSITEKEY"),
            mail_configured: true,
            remote_login: false,
        })
    }

    #[test]
    fn the_login_form_posts_the_fields_flask_expects_and_escapes_values() {
        let page = login(Some("Kode salah"));
        for field in [
            "name=\"username\"",
            "name=\"password\"",
            "name=\"remember_me\"",
            "name=\"csrf_token\"",
            "name=\"next\"",
            "name=\"forgot\"",
        ] {
            assert!(page.contains(field), "{field} missing");
        }
        assert!(page.contains("data-sitekey=\"0xSITEKEY\""));
        assert!(
            page.contains("admin&#34;&lt;script&gt;"),
            "the username is escaped, markupsafe-style"
        );
        assert!(!page.contains("<script>"));
        assert!(page.contains("class=\"flash flash-error\""));
        assert!(page.contains("lang=\"id\""));
    }

    #[test]
    fn without_turnstile_keys_no_widget_and_no_script() {
        let page = login_page(LoginPage {
            instance: "Pustaka",
            locale: "en",
            next: "/",
            username: "",
            csrf: "token",
            error: None,
            turnstile_site_key: None,
            mail_configured: false,
            remote_login: true,
        });
        assert!(!page.contains("challenges.cloudflare.com"));
        assert!(!page.contains("name=\"forgot\""));
        assert!(page.contains("/remote/login"));
        assert!(page.contains("lang=\"en\""));
        assert!(page.contains(">Login<"));
    }

    #[test]
    fn the_code_page_switches_to_recovery_field() {
        let totp = code_page(CodePage {
            instance: "Pustaka",
            locale: "id",
            csrf: "t",
            error: Some("Kode tidak valid"),
            recovery: false,
        });
        assert!(totp.contains("name=\"code\""));
        assert!(!totp.contains("name=\"recovery_code\""));
        let recovery = code_page(CodePage {
            instance: "Pustaka",
            locale: "id",
            csrf: "t",
            error: None,
            recovery: true,
        });
        assert!(recovery.contains("name=\"recovery_code\""));
        assert!(recovery.contains(&format!(">{}</label>", strings("id").recovery)));
    }

    #[test]
    fn the_security_page_shows_either_the_button_the_qr_or_the_disable_form() {
        let off = security_page(SecurityPage {
            instance: "Pustaka",
            locale: "id",
            user: "adminzxc",
            csrf: "t",
            message: None,
            error: None,
            enabled: false,
            pending: None,
        });
        assert!(off.contains("action=\"/me/2fa/start\""));
        let pending = security_page(SecurityPage {
            instance: "Pustaka",
            locale: "id",
            user: "adminzxc",
            csrf: "t",
            message: None,
            error: None,
            enabled: false,
            pending: Some(("data:image/png;base64,AAA".into(), "GEZDGNBV".into())),
        });
        assert!(pending.contains("data:image/png;base64,AAA"));
        assert!(pending.contains("GEZDGNBV"));
        assert!(pending.contains("action=\"/me/2fa/confirm\""));
        let on = security_page(SecurityPage {
            instance: "Pustaka",
            locale: "id",
            user: "adminzxc",
            csrf: "t",
            message: Some("Tersimpan."),
            error: None,
            enabled: true,
            pending: None,
        });
        assert!(on.contains("action=\"/me/2fa/disable\""));
        assert!(on.contains(&strings("id").enabled.to_owned()));
    }
}
