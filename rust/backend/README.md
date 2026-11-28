# taratsa_backend

Rust (axum) side of the Pustaka backend. Branch `rewrite/rust-backend`.

## Strategy: strangler

Flask (`cps/`) stays in production. This service takes over routes one at a time; Caddy decides, per path, which
backend answers. Nothing moves until its Rust version has been compared against Flask on real data.

- **Same databases, Flask owns them.** The service opens `app.db` and Calibre's `metadata.db` **read-only** and
  never writes to either, or to `library/`. Schemas, accounts, password hashes and the signing key are untouched, so
  Calibre desktop and the Flask UI keep working, and a rollback is a Caddy edit.
- **Settings are re-read from `app.db`** (at most once per second), so an admin change in the Flask UI applies here
  too.
- **Same signing key.** `flask_settings.flask_session_key` (or `SECRET_KEY`, as in `cps/__init__.py`) signs the
  `/files` URLs. `src/signing.rs`, `cps/helper.py` and `frontend/scripts/seed.mjs` must stay byte-identical.

## Ported routes

| Route | Rust | Notes |
|---|---|---|
| `/health`, `/healthz`, `/readyz`, `/healthz/live`, `/healthz/ready` | `src/health.rs` | same paths and payload keys as `cps/health.py`; `process` names the Rust runtime |
| `/files/<id>/<fmt>/<version>/<sig>[/<name>]` | `src/files.rs` | signed, immutable, never counts a download; `Range`/`ETag`/`Last-Modified` from `tower-http` |
| `/cover/<id>[/<resolution>]`, `/cover_thumb/<id>[/<resolution>]` | `src/cover.rs` | anonymous unfiltered fast path reads cached JPEG/WebP files and the generated placeholder cards Flask rendered; all cookie/auth/restricted/Drive and cache-miss cases stay on Flask |
| `/series_cover/<id>[/<resolution>]` | `src/cover.rs` | the cover of the series' first book with a cover (no visibility filter, like Flask); same fast path and fallbacks as `/cover`; stays on Flask while `app.db` holds any series thumbnail row |
| `/download/<id>/<fmt>[/<name>]` | `src/download.rs` | anonymous only: counts the download in `app.db` and 302s to the signed `/files` URL; identity and failure cases proxy to Flask |
| `/static/<path>` | `src/static_files.rs` | GET/HEAD of an existing plain file under `cps/static`: werkzeug's ETag, `Last-Modified`, `no-cache`, 304 and single-range 206; a miss, odd path, symlink out, unknown type, other method, 412 or 416 goes to Flask |

Everything else remains Flask. The cover route serves an existing local source
JPEG or prebuilt WebP, or an existing Flask thumbnail-cache file. On cache miss (including requested WebP without
a prebuilt image), Rust proxies the original request to Flask; Flask generates/converts the asset and fills the
shared cache. Generated placeholder cards are still served by Flask. The security headers of `add_security_headers`
are applied here to every response (`src/security.rs`).

### Placeholder cards (2026-11-28)

A book without a cover (`has_cover = 0`, or `cover.jpg` missing) gets a generated card from Flask's
`cover_placeholder.py`. Flask renders it once and keeps it in `<CACHE_DIRECTORY>/placeholders/`; Rust computes the same
file name and serves that file. The name is `sha256("title \0 publisher \0 height \0 fmt")[:32]` plus `.webp`/`.jpg`
(`cover::placeholder_name` mirrors `cover_placeholder.cache_name`). `height` is `255 * resolution` (sm/md/lg = 1/2/4) or
1020 for the original and `og`; `fmt` is `webp` when Werkzeug's `MIMEAccept` contains `image/webp`, else `jpeg`. The
publisher is the first `publishers` row by link id, which is what Flask's `book.publishers[0]` returns for every
coverless book in this library (none has two publishers). A wrong or changed recipe cannot serve a wrong card: Rust
misses the file and proxies, and Flask renders and stores it.

Rust reads `books.title` and that publisher in the same metadata query it already ran for `has_cover`/`path`. Serving the
file matches Flask's `make_response(bytes)` exactly: 200 with `Content-Type`, `Content-Length`, `Cache-Control`
(`public, max-age=86400` for `/cover*`, `public, max-age=604800` for `/cover_thumb*`) and `Vary`
(`Accept, Cookie` / `Accept-Encoding, Cookie`), and NO `ETag`, `Last-Modified`, `Accept-Ranges` or `Content-Disposition`,
so `Range` and `If-None-Match` are ignored and HEAD carries the length with no body.

Checked on a throwaway image with copies of `app.db`/`metadata.db` (no book files, so every book took the placeholder
branch): 2,702 responses over 120 books, 10 URL shapes and both `Accept` values, plus HEAD, `Range` and
`If-None-Match`: 0 mismatches in status, headers or bytes. A cached card takes Rust 2-7 ms against Flask's 22-54 ms.

### Cover fallback requirements

- A request carrying `Cookie` or `Authorization`, a deployment with reverse-proxy-header login, hidden anonymous
  browsing, restricted custom columns or Google Drive always proxies to Flask. The Rust service does not yet
  decode Flask's signed session / remember cookies or implement per-user cover ACLs.
- The anonymous fast-path query applies the guest language and tag filters from the anonymous user row. Restricted
  custom columns still proxy to Flask.
- Thumbnail cache misses and on-demand WebP conversion stay in Flask. Existing cache files are served with
  Werkzeug-compatible path Adler-32 ETags, Last-Modified, Range, HEAD and conditional requests.
  `/cover_thumb` defaults to `sm`; `/cover` does not.

### `/series_cover/<id>[/<resolution>]`

Flask looks for a series thumbnail (`thumbnail.type = 2`, made only by the optional `TaskGenerateSeriesThumbnails`), and
otherwise serves the cover of the first book of the series that has one (`get_series_thumbnail_on_failure`, no
visibility filter and no `ORDER BY`, i.e. the lowest `books_series_link` row). Production has no type-2 rows, so Rust
answers it like `/cover/<book id>`. If such rows ever appear, `Settings.series_thumbnails` sends every series cover to
Flask again, so a generated series thumbnail is never bypassed. Checked against live Flask for all 23 series plus an
unknown id at original/`og`/`sm`/`md`/`lg`/unknown resolution, WebP and JPEG (288 requests): status, headers and body
identical, as are HEAD, `Range` and `If-None-Match`. The route is NOT yet sent to Rust by Caddy.

### `/static/<path>` (LIVE since 2026-11-27 ~18:29 WIB)

Flask's static view (`send_from_directory` over `cps/static`; `cps/cache_buster.py` only strips the `?q=<hash>` query).
It was the largest Flask-served family by request count in the Caddy log (3,539 css + 1,119 js + 958 locale + 255 wasm
of 8,596 Flask-routed requests, 87% of them 304s), so it is the cheapest load to take off the single gevent loop.
Rust answers only what it can reproduce exactly: GET/HEAD of an existing file whose name is plain `[A-Za-z0-9._-]`
segments, whose extension is one of the types listed in `content_type()` (the table was read from the live app for every
extension under `cps/static`), and which does not resolve through a symlink out of the directory. It sends werkzeug's
ETag (`mtime-size-adler32(path)`, shared with the cover code), `Last-Modified`, `Cache-Control: no-cache`,
`Content-Disposition: inline; filename=...`, `Vary: Cookie`, `Accept-Ranges`, the 304 (no `Content-Type`/`Length`) and a
single-range 206. Everything else goes to Flask: a miss (Flask's HTML 404), a directory, `/static` and `/static/`,
`..`/encoded/doubled-slash paths (werkzeug's 308 and 404), a type not in the table, POST/PUT/..., a failed `If-Match` (412),
an unsatisfiable range (416) and any `Range` header Rust cannot parse (werkzeug answers 416, not 200, for `bytes=a-b`;
the first version answered 200 there, found by the comparison below).

Measured against live Flask on the production image's own `cps/static` (837 files), with a Rust instance on a copy of
`app.db`: 5,053 requests (every file as GET, GET with `?q=`, HEAD, `If-None-Match`, `If-Modified-Since`, `Range: bytes=0-9`,
plus traversal, encoded and odd paths and five other methods): status, every header except `Date`, and the body hash
identical, 0 differences. A further 3,575-request pass covered weak/list/`*` validators, `If-Range`, `If-Match`,
`If-Unmodified-Since`, multi-range and suffix ranges on 126 files. Eight keep-alive clients, 250 requests each, random
css/js/font/svg/png: Flask 97 req/s (p50 44 ms, p95 124 ms, max 2,045 ms), Rust 302 req/s (p50 28 ms, p95 50 ms, max 127 ms).
The 540 `/static/css/libs/images/toolbarButton-viewsManagerToggle.svg` 404s in the log are a file the image does not
ship; they stay Flask's 404.

Rollout: image `calibre-web:rust-static` (previous image `calibre-web:pre-rust-static`), then `deploy/caddy-static.patch`
applied to the production Caddyfile (a `handle` block with the same Rust-first `lb_policy first` upstream list as `/files`;
backup `/home/devuser/backups/Caddyfile.pre-rust-static.2026-11-27`) and `caddy reload`. Rollback: delete the block and
reload. The same 5,022-request comparison, run again from `caddy_net` against the DEPLOYED binary on port 8084 and Flask on
8083, found 0 differences.

Live (first minutes): the Flask-served requests of that family are now answered by Rust, p50 8 ms for 304s and 28 ms for
200s. The slow tail in the Caddy log (about 2 s) is the requests Rust hands to Flask (misses: Flask renders its HTML 404)
and the period before the switch, when Flask's single loop was shared with the bulk import. A real finding: the missing
`toolbarButton-viewsManagerToggle.svg` is requested ~90 times per 5 minutes and each 404 costs a Flask round trip, so
shipping that file (or a Caddy-level 404 for it) would remove the last common Flask static hit.

### `/read/<id>/pdf` (LIVE since 2026-11-27 ~21:28 WIB)

The PDF.js viewer shell for the ANONYMOUS visitor (`src/reader.rs`). It renders the unchanged `cps/templates/readpdf.html`
(compiled in with `include_str!`, so the template and the route cannot drift) and fills the same few Jinja values:
the title, the signed `/files` URL (`/show/<id>/pdf` when the book has no PDF), the translated "PDF Reader", the
`GOOGLE_SITE_VERIFICATION` meta, the Umami snippet, and the print/download buttons (the guest's download role). A request
with any `Cookie` or `Authorization`, reverse-proxy login, a restricted custom column, Google Drive, guest browsing off,
a guest without the viewer role, a book the guest cannot see, an unknown or non-numeric id, a trailing slash, any other
format, a query error, or an `Accept-Language` this code cannot place exactly, is proxied to Flask unchanged. So
logged-in readers keep their per-session behaviour (bookmarks, CSRF, per-user archive and filters), and no session
cookie is decoded in Rust.

The guest's role, language and tag filters are read FRESH on every request (`settings::load_pdf_reader`), not from the
1 s settings cache the other routes use: this page's access depends on them, so a revocation applies to the next request.

Language: Flask picks the translation with Werkzeug's `LanguageAccept` ordering, Babel's `Locale.parse` and
`negotiate_locale` against the catalogs in `cps/translations`. Babel's CLDR data is not reimplemented. Instead
`tools/gen_locale_table.py` asks the real Babel inside the app image what 5,016 tag shapes map to and writes
`src/locale_table.txt`; `src/locale.rs` only parses the header and looks tags up. Regenerate the table when
`cps/translations` or Babel changes (command in the script's docstring). Absent `Accept-Language` means English, as in
Flask (64 of 292 production reader requests had none).

Measured against live Flask (2026-11-27), Rust on a copy of `app.db`, the production image's own template and library:
800 books (700 random PDFs, 40 without a PDF, 60 with `<`, `>`, `&`, quotes or backslashes in the title) across 7
`Accept-Language` shapes: status, every header except `Date`, and the body hash identical, 0 differences. Two bugs the
comparison found: Jinja's whitespace around block tags (the first version was 14 bytes short) and `tojson`, which
writes every non-ASCII character as `\uXXXX` (30 titles with en dashes or the replacement character). 85 further cases
(odd `Accept-Language` values, cookies, bad ids, other formats): identical apart from `Set-Cookie` (a fresh random
session per Flask response, so two Flask answers differ too). In Chromium the real 127-page, 4.8 MB report opens and
renders page 1 through Rust (1,096 ms with `id-ID`, the PDF itself served by the public site), with print and download
buttons and the same 404 for the viewer's missing `toolbarButton-viewsManagerToggle.svg` as Flask.

Live: `@rust_reader` in the production Caddyfile (`path_regexp ^/read/[0-9]+/pdf$`, Rust first and Flask as failover,
same upstream list as `/files`), inside `@flask`, so the `@reader` no-store headers still apply. Only this exact shape is
routed; `/read/<id>/epub` and everything else stay on Flask. Backup of the Caddyfile:
`/home/devuser/backups/Caddyfile.pre-rust-reader.2026-11-27`; roll back by deleting the block (then `caddy reload`).
First 3 minutes: 44 requests, all 200, Caddy-side p50 13 ms / p95 29 ms (Flask: p95 about 0.9 s), none reached Flask's
access log. `readpdf.html` is compiled into the binary, so the Dockerfile copies it into the builder stage
(`/app/cps/templates/`) and `build.rs` rebuilds on a template change; after a pdf.js upgrade, rerun the comparison.
Rechecked against the DEPLOYED binary on pdf.js 6.5.438 (2026-11-27): 800 books, status, every header except `Date` and
the body hash identical to Flask, 0 differences.

### `/api/read/<id>/ocr[/<fmt>]` and `.../ocr/status[/<fmt>]` (LIVE since 2026-11-27 ~22:35 WIB)

Answers ONE case: the anonymous visitor asks for a book whose OCR text is already cached, and the reply is Flask's
`{"available":true,"state":null}\n` (`application/json`, `Vary: Cookie`, no `Cache-Control`). Everything else is proxied to
Flask unchanged, because it needs state Rust does not have: a PDF miss asks the in-memory job queue (`ocr_job_state`),
an EPUB miss extracts the text inline, a file under the PDF format that is not a PDF raises, and every 404 is Flask's own
page. So this route never says `available: false` and never invents an error. Cookie, `Authorization`, reverse-proxy
login, a restricted column, Google Drive, guest browsing off, a guest without the viewer role, a guest with archived
books and a trailing slash all go to Flask; the guest's role and archive rows are read fresh per request.

The hit test rebuilds the cache file name Flask writes: `<book id>-<sha256 of json.dumps({version, book_id, format, name,
size, mtime_ns, extract_version|layout_version}, sort_keys=True, separators=(",", ":"))>.json`, with the file's size and
mtime in nanoseconds, then checks the file parses as `status: ready` with the four fields `_load_cache` needs. The version
numbers (`CACHE_VERSION`, `EPUB_EXTRACT_VERSION`, `PDF_LAYOUT_VERSION`) are read out of `cps/ocr_service.py` by `build.rs`,
so a bump there reaches the binary at the next build (the Dockerfile copies that file into the builder); without it every
book would silently be proxied. `src/pyjson.rs` is Python's `json.dumps` string escaping (`ensure_ascii`, DEL as
`\u007f`): the reader's `tojson` had left DEL literal, which no real title has (0 of 24.5k in the library) but Python does
not do.

Measured against live Flask (2026-11-27), Rust on a copy of `app.db` with the real OCR cache read-only: 1,200 random
book/format pairs, 1,186 answered by Rust and identical to Flask in status, every header except `Date` and body; the 14
Rust did not answer are Flask's (`available:false` for 11 PDFs not yet OCR'd, 404 for 3 books whose PDF is not a PDF).
Edge shapes (`PDF`, `Pdf`, `00004644`, `%34644`, `?x=1`, `%70df`) match Flask; a trailing slash, `txt` and an unknown book
reach Flask. 800 books of `/read/<id>/pdf` were rechecked on the refactored binary: 0 differences. Traffic that justifies
it: 195 requests in 71 s from `pustaka-astro` (the book page asks per format), 28 ms each in Flask's single gevent loop.
Astro sends no cookie from the server-side fetch unless the visitor has one, so the visitor's own requests hit this route.

Live: `@rust_ocrstatus` in the production Caddyfile (`path_regexp ^/api/read/[0-9]+/ocr(/status)?(/(pdf|epub))?$`, Rust
first and Flask as failover, inside `@flask` so the `@reader` no-store headers apply; backup
`Caddyfile.pre-ocr-document.2026-11-27`), the image rebuilt from `6319bbf8c`, and the Astro service's
`BACKEND_URL=http://calibre-web-automated:8084` (compose), so the book page and the text reader call Rust directly.
Verified live: the cached document and status answer from Rust, unknown books and EPUB misses reach Flask (which
extracts and caches, so the next call is a hit), and both Astro text pages (`/read/<id>/ocr/<fmt>/`) answer 200.

The document route (`GET /api/read/<id>/ocr[/<fmt>]`) adds Flask's `jsonify` body on the same cache hit:
`{"book":{"id":N,"title":"…"},"document":{"markdown_html":"…","page_count":N,"pages_routed_to_ocr":N,
"processing_time_ms":N}}\n` with keys sorted, `ensure_ascii` string escaping (`pyjson.rs`) and `Cache-Control:
private, no-store`; every miss (202 with the job state, or a 404) stays Flask's. Compared with live Flask on the same
1,200 pairs: 1,186 answered by Rust, 0 differences, the largest (3.4 MB) in 4-10 ms.

Ordering trap worth remembering: pointing Astro at `:8084` BEFORE this route existed made Rust answer its own 404 for
`/api/read/<id>/ocr/<fmt>` (no catch-all exists), so both OCR text pages returned 404 for about 15 minutes
(2026-11-27 22:2x WIB). Add the Rust route first, then switch `BACKEND_URL`; a 404 from Rust is not proxied.

### `/show/readium/<id>/…` (LIVE since 2026-11-27 ~23:4x WIB)

Port of `cps/readium.py`: `manifest.json`, `positions.json` and every zip member, for the ANONYMOUS visitor
(`src/readium.rs`). The manifest and position list are built as ordered [`pyjson::Py`] values and written with Python
`json.dumps` shape (key order, `", "`/`": "` separators, `ensure_ascii`, `repr` floats), so the bytes equal Flask's.
The XML side is a small namespace-aware DOM over quick-xml with lxml's parser settings modelled: entity references are
expanded (`&amp;`, `&#233;`), line endings normalised (CRLF inside a paragraph was one real off-by-one), attribute
values normalised, comments kept as text-bearing nodes, `posixpath`/`urllib` path and URL rules reproduced.

Two deliberate hand-backs to Flask, because lxml's re-serialisation cannot be reproduced byte for byte: a markup member
that WOULD be rewritten (`<script>`, `on*`, `srcdoc`, `javascript:` URLs) and every `text/html` member (libxml's HTML
parser is not the XML parser). A clean member is served with its exact bytes, which is every member of the real library
(~6,000 checked, none modified), and an unparsable member is Flask's 404. Cookie-bearing requests and the guest gates
(viewer role, archived books, restricted column, reverse-proxy login, Google Drive) go to Flask unchanged, so the ~13%
of readium traffic that carries a Flask session cookie keeps Flask's per-user view; the ~87% cookieless traffic moves here.

Measured against live Flask (2026-11-27): 300 EPUBs × (manifest, positions) = 600 bodies identical in status, headers
(except `Date`) and bytes, plus `304` on a matching `If-None-Match`; 558 resource members (XHTML, CSS, WebP, PNG, JPEG,
SVG) identical, the only proxied ones the 8 `text/html` members. Live: `@rust_readium` (`path_regexp
^/show/readium/[0-9]+/`, backup `Caddyfile.pre-readium.2026-11-27`), the EPUB reader renders and turns pages in
Chromium with zero console errors, and Flask's access log shows only the cookie-bearing requests.

### Flask session cookie (`src/session.rs`, LIVE 2026-11-27 ~00:5x WIB)

The last Flask-served load was identity traffic: `/read/<id>/epub` 159, `/api/read/*` 112, readium 42 and `/download` 29
requests in three minutes, all carrying a Flask `session` cookie. Rust now verifies that cookie itself instead of handing
every cookie to Flask. It reproduces Flask's stock `SecureCookieSessionInterface`: `URLSafeTimedSerializer(secret,
salt="cookie-session", serializer=TaggedJSONSerializer(), key_derivation="hmac", digest_method=sha1)`,
i.e. `base64url(payload).base64url(timestamp).base64url(signature)` with the signature over the first two segments
using `HMAC-SHA1(HMAC-SHA1(secret, salt), …)`, a 4-byte big-endian timestamp checked against Flask's 31-day
`permanent_session_lifetime`, and a JSON payload that is zlib-compressed (marked by a leading `.` on the base64 TEXT)
when that is shorter. Being named by the cookie is not being logged in: `cps.usermanagement.load_user` also needs a
`user_session` row matching `(_id, _random)` and belonging to that user, and `session_row_matches` reproduces it
(expiry is not checked there, so not here either).

Rules: no `session` cookie, or a verified session without `_user_id` → the anonymous guest (Flask's empty session);
a verified user with the revocation row → that user's own role, language and tag filters (`settings::load_access`);
a cookie that does not verify, or any case this code cannot resolve → Flask. That last rule is deliberate: a user whose
session Rust misreads must never receive the guest view of a book their own filters hide. `SECRET_KEY` overrides the
stored key, `SECRET_KEY_FALLBACKS` is not modelled (unset in production), so an old-key cookie goes to Flask.

Readium and both OCR routes now take `session::identify` instead of proxying every cookie. Verified against the app
image's itsdangerous (byte-identical cookie decodes, a compressed and an uncompressed payload), a tampered cookie, an
expired one, a revoked `user_session` row, and a user whose denied tag hides the book. Live: the EPUB reader renders
with a real browser session, and only an unverifiable `session=garbage` still reaches Flask.

### `/read/<id>/epub` (`src/epub_page.rs`, LIVE 2026-11-28 ~00:3x WIB)

The EPUB reader shell for the ANONYMOUS visitor, a port of `cps/templates/read.html` (the public site has no reader
accounts; only the admin logs in). Rust now MINTS state, not only reads it: Flask's page calls `csrf_token()`, which stores
a value in the session and so always answers with a `Set-Cookie`. Both are reproduced in `session.rs`:

* the session cookie: `{"csrf_token":"<40 hex>"}` (compact JSON, `TaggedJSONSerializer`), zlib only when shorter, signed with
  `hmac` key derivation and salt `cookie-session`, the timestamp as minimal big-endian bytes (4 until 2106);
* the CSRF token: `URLSafeTimedSerializer(secret, salt="wtf-csrf-token")` left on itsdangerous' DEFAULTS, i.e.
  `django-concat` key derivation, not the session's `hmac`. The first version signed it with `hmac`, and Flask's own
  `validate_csrf` rejected it: that was the one real bug of this port, found only by feeding the token to Flask's validator.

Verified: byte-identical to Flask in six locales (`en id de ar zh-TW pt-BR`) for the page body (token aside); 400 random
EPUB books plus 150 whose titles carry HTML/JSON-special or non-ASCII punctuation, all identical in status, body and
whether `Set-Cookie` is sent; Flask's `URLSafeTimedSerializer.loads` and `flask_wtf.csrf.validate_csrf` accept the cookie
and token Rust minted; a returning visitor's valid cookie is reused (no new `Set-Cookie`). Labels come from
`src/reader_strings.json`, generated from the app image's catalogs by `tools/gen_reader_strings.py` (regenerate when
`read.html` or the catalogs change). A logged-in session, a cookie that does not verify, `kepub`, a trailing slash and
every ACL switch go to Flask, because there the page carries a bookmark and `useBookmarks: true`.

Live: `@rust_reader` widened to `^/read/[0-9]+/(pdf|epub)$` (backup `Caddyfile.pre-epubshell.2026-11-28`); 21 requests in
70 s at p50 6.3 ms / p95 20.3 ms with none reaching Flask, a fresh Chromium profile renders three chapter frames and sets
one `HttpOnly; SameSite=Lax` cookie. A new template embedded by Rust must be copied in the Dockerfile's builder stage
too (`read.html` was missed once, the same trap as `readpdf.html`).

### `/book/<id>[/…]` and `/author/<id>[/<page>]` (`src/legacy.rs`, written 2026-11-28)

The legacy numeric URLs of the main host, which Flask answers with a `301` to the canonical slug page and Caddy sends to
Flask (`@legacy_book`, `@legacy_author`). Rust answers the same `301` for the visitor with no cookie or credential:

* **Book**: `book-slugs.json` (`BOOK_SLUGS_PATH`, the file `seed.mjs` writes) maps id to slug; the map is re-read when
  the file's mtime changes, like `_get_book_slugs`. `/book/<id>` and `/book/<id>/` give `/book/<slug>/`;
  `/book/<id>/<slug>[/<extra>]` gives `/book/<id>/`. An id missing from the map, a slug that fails Flask's
  `[a-z0-9]+(-[a-z0-9]+)*` pattern, an unreadable map, a library that needs a login and the `old-pustaka` host (which
  renders the real page) are proxied.
* **Author**: the slug is computed from `authors.name` with Flask's `_author_slug` (NFKD, combining marks dropped, a
  table of letters NFKD leaves alone, runs of non-`[a-z0-9]` to one hyphen, `-<id>` when two names collapse to the same
  slug, when the base is all digits or longer than 96). `unicode-normalization` does the NFKD; Python's `unicodedata`
  and the crate both implement Unicode, so a Unicode version gap could differ on a name using a very new character
  (none of the 7,961 authors does: 44 have non-ASCII names, all compared). Pages: `/<n>` and `/page/<n>`, `>1` adds
  `page/<n>/`.
* Everything else is Flask's: `%` anywhere in the path (the server would decode it first), a shape werkzeug does not route
  (`/author/1/page`, `/book/1/a/b/`), an unknown book or author (Flask's HTML 404 page), other methods.

Checked against Flask on a copy of `app.db` (no counters are written by these routes): 3,873 requests (the 270 authors
with a non-ASCII name, a collision, an all-digit slug, a name over 96 characters or the `author` fallback, 389 more random
authors, page variants, 3,000 book ids, aliases, 14 odd shapes, HEAD, a cookie and the legacy host): 3,870 identical in
status, headers and body. The three differences are not this route: two are Flask's own refreshed `Set-Cookie` on
requests Flask itself answers (`/author/1/x`, `/author/1/2/3`: a 302 it produces both times, with a different signed
timestamp), and one is `/book/<id>/%2e`, which Rust hands to Flask and `proxy.rs` forwards with `%2e` collapsed to a dot
segment (reqwest's URL parser), so Flask answers a different redirect than for the raw path. That is a property of the
shared proxy for every route and only matters for a crafted path; it was left alone. One redirect: Flask 0.6-1.1 s, Rust
0.5-12 ms. LIVE since 2026-11-28 ~04:34 UTC: `@legacy_author` and `@legacy_book` in the production Caddyfile go Rust first with
Flask as failover (backup `Caddyfile.pre-legacy-rust.2026-11-28`); image `calibre-web:legacy-index`, rollback
`calibre-web:pre-legacy-index`. Checked after the reload: `/book/<id>`, `/book/<id>/`, `/author/<id>`, `/author/<id>/2` answer
the slug redirect; an unknown id answers 404 from Flask (Rust hands it over, and Flask's own access log shows the request).

### `/download/<id>/<fmt>[/<name>]` (the one route that writes)

Port of `download_link` + `get_download_redirect`, for the ANONYMOUS visitor only. It checks the guest's
`download` role, language and tag filters, that the file exists, then does what `ub.update_download` does (the same
`INSERT ... ON CONFLICT DO UPDATE` on `downloads`, user 0, a connection with `PRAGMA foreign_keys=ON`, 30 s busy
timeout; a failed write is logged, never fails the download), sends the Umami `file-download` event in the
background (`UMAMI_URL=off` disables it; `DNT: 1` skips it) and answers werkzeug's 302 to the signed `/files` URL:
same `Location`, body, `Cache-Control: private, no-store` and `Vary: Cookie` as Flask.

Everything else is proxied to Flask UNCHANGED, and nothing is counted on that path, so no download is counted
twice: `Cookie`/`Authorization`, reverse-proxy login, hidden anonymous browsing, Google Drive, restricted columns,
a guest without the download role, a Kindle User-Agent, a missing `User-Agent` (Flask answers 500), a non-numeric
id, and any book/format/file that is missing, hidden or has an unusable name or timestamp (so every 404 is Flask's).

Not ported: everything else.

Measured (2026-11-27, against copies of the live `app.db`, never the live file):

- Redirect: headers and the 513-byte body identical to Flask for book 4644; the file name and percent-encoding
  matched Flask's `get_valid_filename` + werkzeug quoting for 1,800 real books (1,500 random, 300 with special
  characters), 0 mismatches.
- Concurrency: 1,500 Rust `/download` requests (4 clients) next to 1,500 Flask-style writers (3 threads, same SQL, 30 s
  busy timeout, foreign keys on) on one WAL database: 0 failures and 0 lost counts (expected +3,000, got +3,000);
  Rust latency p50 10 ms, p99 336 ms, max 851 ms while sharing the write lock.
- Umami: the `file-download` payload and `User-Agent` equal what `_track_download_analytics` sends (`file` is
  `data.name` + format); `DNT: 1` sends nothing in both.

Rollout (LIVE since 2026-11-27): `.env` has `RUST_BACKEND_ENABLED=true` and `RUST_BACKEND_LISTEN=0.0.0.0:8084`
(reachable only over `caddy_net` as `calibre-web-automated:8084`; never publish it on the host, it has no
authentication). The production Caddyfile (`/home/wibi/apps/caddy/Caddyfile`, applied with `caddy reload`) sends
`/download/*` (since ~10:41 WIB), `/cover/*`, `/cover_thumb/*`, `/series_cover/*` (since ~11:25 WIB) and `/files/*` (since
~12:05 WIB, after the export-lock fixes below) to
`calibre-web-automated:8084 calibre-web-automated:8083` with `lb_policy first`, so Flask answers whenever Rust does not
(checked by killing Rust: all three routes kept answering). The cover `handle_response` blocks (2xx cached for a day,
errors `no-store`) stay in Caddy and apply to either upstream. The entrypoint restarts Rust 2 s after it exits.
Anything Rust cannot answer itself is proxied to Flask, so the worst case is a slower response, not a lost count.

Checked live through https://pustaka.taratsa.id: anonymous `/download/4644/pdf` -> 302 with Flask's headers, the
followed link downloads the 4,808,966 bytes, a cookie request is answered by Flask, an unknown id is a 404, and the
counter moved by exactly the requests Rust and Flask each answered. First 495 requests after the switch: 471 x 302,
24 x 404, no 502, p50 8 ms / p95 19 ms. Covers: 4,510 comparisons against live Flask (`/cover`, `/cover_thumb`; 350
books with a cover, 100 without, an unknown id; 5 URL shapes; WebP and JPEG) found 0 differences.
Baseline before the switch (Caddy log): `/download` ~292 requests per 22 minutes (6 with a cookie); covers ~12 per
minute, 241 of 242 anonymous, Flask p50 89 ms but p95 13.6 s / p99 23.8 s. Rust's proxy to Flask therefore uses a READ
timeout (120 s), not a total one: a slow Flask answer must not become a 502.

Rollback: restore the previous Caddyfile (`/home/devuser/backups/Caddyfile.pre-rust-files-v2.2026-11-27` is the
state before `/files`, `Caddyfile.pre-rust-covers.2026-11-27` the `/download`-only state, `Caddyfile.pre-rust-download.2026-11-27` the original) and `caddy reload`; or set
`RUST_BACKEND_ENABLED=false` and `docker compose up -d calibre-web-automated`. Previous images: `calibre-web:pre-rust-files3`, `calibre-web:pre-rust-covers`,
`calibre-web:pre-rust-download`. Rust logs to `/config/rust-backend.log` (errors only unless `RUST_LOG=info`).

### Concurrent exports (found 2026-11-27, `/files` rolled back once because of it)

`calibredb export` takes an exclusive lock on the library, so two exports can never overlap. With `MAX_EXPORTS=4`, four
simultaneous `/files` requests to Rust gave ONE embedded file and THREE stored files ("Another calibre program ...
is running"), and the stored bytes (7,533,766 for book 7) differ from an export (7,584,735) under a URL the CDN keeps
for a year. Flask alone never shows this (it serves requests one by one). Rust now exports one at a time, retries a
"library locked" answer 12 times (500 ms apart), and hands the request to Flask instead of serving the stored file when
the library is still locked; any other export failure serves the stored file, like Flask.

That made Rust correct on its own (18 of 18 simultaneous Rust requests embedded, in three rounds), but not safe
TOGETHER with Flask: with 6 requests to Rust and 3 to Flask at the same instant, the Rust ones all embedded and Flask
returned the stored file for 2 of its 3, because Flask did not retry when Rust held the lock. Two exporters on one
library is the real defect, so `do_calibre_export()` (`cps/embed_helper.py`, also used by mail and convert) now waits
for the lock the same way (12 tries, 500 ms apart) instead of falling through to the stored file. Flask's loop is not
monkey-patched, so that sleep blocks it for as long as it waits; the export itself already blocked it the same way.

### Related project: `Taratsa/calibre` (read 2026-11-28, not used)

`github.com/Taratsa/calibre` is a fork of `kteal/calibre`: a pre-release (0.1.0) Rust crate that reads and writes Calibre
libraries without Calibre or Python (Apache-2.0 and MIT, "do not publish until the owner reviews licensing and provenance").
What matters here: it supports ONLY `PRAGMA user_version = 27` and refuses other versions, and this library is **28**
(`application_id` 0x63616c69 matches; no custom columns, no `full-text-search.db`), so the crate would not open it today. It also
says locale-aware sort generation, exact filename parity, custom-column writes, preferences, notes and annotations are
unsupported, and it does not embed metadata into an exported file, which is what `calibredb export` does for `/files` (about
0.94 s of CPU per call, ~10% of one core). So it does not replace that export, and nothing here depends on it. Where it could
help later: read-only listing and audit (`books().query`, `audit`) once a schema-28 policy exists, and trash handling.

### `/files/*` live check (2026-11-27)

Parity before the switch: 50 real signed URLs (25 PDF, 25 EPUB) compared with Flask, bodies equal apart from the
`xmp:MetadataDate` that every `calibredb export` rewrites; status and headers (`Vary: Cookie`, the 304 headers with
Flask's missing `Last-Modified`) equal after two fixes this found; 404 and 416 pages are Flask's own (Rust hands those
requests over). Simultaneous Rust and Flask exports: 59 of 59 embedded over six rounds (up to 8 + 8 at once), after the
lock fixes. Live, first 5 minutes: 35 requests, all 200, p50 1.0 s, p95 2.1 s (Flask alone had p95 10.3 s, p99 21.6 s).
Books whose export equals their stored file (228, 213: nothing to embed) legitimately return the stored size.

### Behaviour that is deliberately the same as Flask

- **Metadata embedding.** With `config_embed_metadata` and a Calibre binaries directory (production has both), a
  `/files` response is a fresh `calibredb export` of the book, not the stored file; `src/export.rs` runs the same
  command, bounded by `MAX_EXPORTS` (default 1) and a 5 minute timeout, and serves the stored file if the export
  fails. A staged copy is deleted as soon as the response has the file open.
- **Stale links.** A version that no longer matches 302s to `/download/<id>/<fmt>` with `private, no-store`.
- **First author** in the file name is the lowest author id (what SQLAlchemy's lazy load returns; checked against
  the 1,228 multi-author books of the live library, 0 differences).
- **`last_modified`** is read as UTC from the first `YYYY-MM-DD HH:MM:SS` of the stored text; a `+00:00` suffix
  (two rows) is ignored, as SQLAlchemy's `TIMESTAMP` does.

### Not served from Rust (returns 501 so a wrong Caddy rule is loud, never silently wrong)

- Google Drive libraries (`config_use_google_drive`).
- `kepub` with embedded metadata and kepubify configured.

Production uses neither (`config_use_google_drive=0`; 0 kepub formats in the library).

## Run

```bash
APP_DB_PATH=/config/app.db LISTEN=127.0.0.1:8084 RUST_LOG=info ./taratsa_backend
```

| Variable | Default | Meaning |
|---|---|---|
| `APP_DB_PATH` | `/config/app.db` | Flask's app database |
| `LISTEN` | `127.0.0.1:8084` | bind address |
| `MAX_EXPORTS` | `1` | concurrent `calibredb export` processes (calibre locks the library, so more only fail on each other) |
| `SECRET_KEY` | none | overrides the stored signing key, like Flask |
| `ONION_LOCATION` | none | adds the `Onion-Location` header |
| `UMAMI_URL` | `https://umami.kenadera.org/api/send` | Umami endpoint of the `/download` event; `off` disables it |

## Check

```bash
cargo fmt --check && cargo clippy --release --all-targets && cargo test --release
```
