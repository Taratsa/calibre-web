//! Readium Web Publication Manifest + position list + single zip members for EPUB files, a port of `cps/readium.py`.
//!
//! The browser navigator (Readium ts-toolkit) does not read zips: it asks for `/show/readium/<id>/manifest.json`,
//! `positions.json` and every chapter/image/font member. The manifest body must equal Flask's `json.dumps` byte for byte
//! (key order, `", "`/`": "` separators, `ensure_ascii`), so it is built as [`Py`] values, never `serde_json` maps.
//!
//! Chapters render in a same-origin iframe that can reach the logged-in page, so both implementations strip active
//! content from XHTML/HTML/SVG members. Flask re-serialises a dirty document with lxml, which no Rust writer reproduces
//! exactly; Rust therefore PARSES to decide: a clean member is served with its exact bytes (that is every member of the
//! real library: ~6,000 checked, none modified), and a member that would be rewritten — or that Rust cannot parse the
//! way lxml does — is proxied to Flask. `text/html` members always go to Flask (libxml's HTML parser differs from XML).

use crate::pyjson::{self, Py};
use crate::{AppState, library, proxy};
use axum::Router;
use axum::extract::{OriginalUri, Path, State};
use axum::http::{HeaderMap, HeaderValue, Method, StatusCode, header};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use quick_xml::events::Event;
use quick_xml::reader::NsReader;
use std::collections::HashMap;
use std::io::Read;
use std::path::{Path as FsPath, PathBuf};
use std::sync::{Arc, LazyLock, Mutex};

const ROLE_VIEWER: i64 = 1 << 8;
const OPF_NS: &str = "http://www.idpf.org/2007/opf";
const DC_NS: &str = "http://purl.org/dc/elements/1.1/";
const NCX_NS: &str = "http://www.daisy.org/z3986/2005/ncx/";
const XHTML_NS: &str = "http://www.w3.org/1999/xhtml";
const OPS_NS: &str = "http://www.idpf.org/2007/ops";
const CONTAINER_NS: &str = "urn:oasis:names:tc:opendocument:xmlns:container";
const EPUB_PROFILE: &str = "https://readium.org/webpub-manifest/profiles/epub";
const MANIFEST_CONTEXT: &str = "https://readium.org/webpub-manifest/context.jsonld";
const POSITION_CHARS: i64 = 1024;
const MAX_RESOURCE_BYTES: u64 = 64 * 1024 * 1024;

pub fn routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/show/readium/{book_id}/manifest.json", get(manifest))
        .route("/show/readium/{book_id}/positions.json", get(positions))
        .route("/show/readium/{book_id}/{*member}", get(resource))
}

async fn manifest(
    State(state): State<Arc<AppState>>,
    Path(book_id): Path<String>,
    uri: OriginalUri,
    method: Method,
    headers: HeaderMap,
) -> Response {
    serve(state, book_id, Kind::Manifest, uri, method, headers).await
}

async fn positions(
    State(state): State<Arc<AppState>>,
    Path(book_id): Path<String>,
    uri: OriginalUri,
    method: Method,
    headers: HeaderMap,
) -> Response {
    serve(state, book_id, Kind::Positions, uri, method, headers).await
}

async fn resource(
    State(state): State<Arc<AppState>>,
    Path((book_id, member)): Path<(String, String)>,
    uri: OriginalUri,
    method: Method,
    headers: HeaderMap,
) -> Response {
    serve(state, book_id, Kind::Member(member), uri, method, headers).await
}

enum Kind {
    Manifest,
    Positions,
    Member(String),
}

/// Every failure that Flask owns (no book/format/file, unparsable EPUB, identity) becomes the same proxied request.
async fn proxy_or(
    state: Arc<AppState>,
    path: &str,
    method: Method,
    headers: HeaderMap,
) -> Response {
    proxy::fallback_reconstructed(state, path, method, headers).await
}

async fn serve(
    state: Arc<AppState>,
    book_id: String,
    kind: Kind,
    uri: OriginalUri,
    method: Method,
    headers: HeaderMap,
) -> Response {
    let path = uri
        .0
        .path_and_query()
        .map_or_else(|| uri.0.path().to_owned(), |v| v.as_str().to_owned());
    let plain_digits = !book_id.is_empty() && book_id.bytes().all(|b| b.is_ascii_digit());
    let Ok(book_id) = book_id.parse::<i64>() else {
        return proxy_or(state, &path, method, headers).await;
    };
    if !plain_digits {
        return proxy_or(state, &path, method, headers).await;
    }

    let settings = match state.settings().await {
        Ok(settings) => settings,
        Err(error) => {
            tracing::error!("readium settings unavailable: {error}");
            return proxy_or(state, &path, method, headers).await;
        }
    };
    if headers.contains_key(header::AUTHORIZATION)
        || settings.reverse_proxy_login
        || settings.restricted_column != 0
        || settings.use_google_drive
    {
        return proxy_or(state, &path, method, headers).await;
    }
    // The request's own Flask session decides who it is; a cookie that does not verify stays with Flask.
    let access = match crate::session::identify(&state, &settings, &headers).await {
        Ok(crate::session::Who::Anonymous(_access)) if !settings.anonymous_browse => {
            return proxy_or(state, &path, method, headers).await;
        }
        Ok(crate::session::Who::Anonymous(access)) | Ok(crate::session::Who::User(access)) => {
            access
        }
        Err(_) => return proxy_or(state, &path, method, headers).await,
    };
    if access.role & ROLE_VIEWER == 0 || access.has_archived {
        return proxy_or(state, &path, method, headers).await;
    }
    let metadata_db = settings.metadata_db();
    let book_path = settings.book_path().to_path_buf();
    let found = tokio::task::spawn_blocking(move || {
        let found = library::find_visible_format(
            &metadata_db,
            book_id,
            "EPUB",
            &access.language,
            &access.denied,
            &access.allowed,
        )
        .ok()
        .flatten()?;
        let file = book_path
            .join(&found.book_path)
            .join(format!("{}.epub", found.name));
        file.is_file().then_some(file)
    })
    .await;
    let Some(epub) = (match found {
        Ok(found) => found,
        Err(_) => return proxy_or(state, &path, method, headers).await,
    }) else {
        return proxy_or(state, &path, method, headers).await;
    };

    // Cache headers come from the file's identity, exactly like `_readium_cache_headers` (`set_etag` quotes the value).
    let identity = std::fs::metadata(&epub)
        .ok()
        .and_then(|meta| Some((mtime_ns(&meta)?, meta.len())));
    let Some((mtime, size)) = identity else {
        return proxy_or(state, &path, method, headers).await;
    };
    let etag = format!("\"{mtime}-{size}\"");
    let not_modified = headers
        .get(header::IF_NONE_MATCH)
        .and_then(|value| value.to_str().ok())
        .is_some_and(|value| etag_matches(value, &etag));

    let outcome = tokio::task::spawn_blocking(move || match kind {
        Kind::Manifest => publication(&epub, mtime, size).map(|(manifest, _)| {
            let mut body = manifest.clone();
            if let Py::Object(pairs) = &mut body {
                let base = format!("/show/readium/{book_id}/manifest.json");
                pairs.push((
                    "links".to_owned(),
                    Py::List(vec![
                        Py::obj([
                            ("rel", Py::str("self")),
                            ("href", Py::str(base)),
                            ("type", Py::str("application/webpub+json")),
                        ]),
                        Py::obj([
                            ("rel", Py::str("http://readium.org/positions")),
                            ("href", Py::str("positions.json")),
                            (
                                "type",
                                Py::str("application/vnd.readium.position-list+json"),
                            ),
                        ]),
                    ]),
                ));
            }
            (pyjson::dumps(&body).into_bytes(), "application/webpub+json")
        }),
        Kind::Positions => publication(&epub, mtime, size).map(|(_, positions)| {
            (
                pyjson::dumps(&positions).into_bytes(),
                "application/vnd.readium.position-list+json",
            )
        }),
        Kind::Member(member) => read_resource(&epub, &member),
    })
    .await;

    let (content, media_type) = match outcome {
        Ok(Ok(result)) => result,
        // Active content, unparsable markup or an HTML member: lxml's rewrite is Flask's alone.
        Ok(Err(())) | Err(_) => return proxy_or(state, &path, method, headers).await,
    };

    let mut response = if not_modified {
        StatusCode::NOT_MODIFIED.into_response()
    } else {
        (StatusCode::OK, content).into_response()
    };
    let out = response.headers_mut();
    out.insert(
        header::CONTENT_TYPE,
        HeaderValue::from_str(media_type)
            .unwrap_or(HeaderValue::from_static("application/octet-stream")),
    );
    out.insert(
        header::CACHE_CONTROL,
        HeaderValue::from_static("private, no-cache"),
    );
    out.insert(
        header::ETAG,
        HeaderValue::from_str(&etag).expect("etag is ASCII"),
    );
    out.insert(header::VARY, HeaderValue::from_static("Cookie"));
    // `add_security_headers` marks every /show/readium/ response noindex.
    out.insert(
        axum::http::HeaderName::from_static("x-robots-tag"),
        HeaderValue::from_static("noindex"),
    );
    response
}

fn etag_matches(header: &str, etag: &str) -> bool {
    header.split(',').any(|candidate| {
        let candidate = candidate.trim();
        candidate == "*" || candidate.trim_start_matches("W/") == etag
    })
}

fn mtime_ns(meta: &std::fs::Metadata) -> Option<i128> {
    let modified = meta.modified().ok()?;
    let since = modified.duration_since(std::time::UNIX_EPOCH).ok()?;
    i128::try_from(since.as_nanos()).ok()
}

// ── publication cache (lru_cache(maxsize=32) on path, mtime_ns, size) ───────────────────────────────────────────────
type Identity = (PathBuf, i128, u64);
type Publications = HashMap<Identity, Arc<(Py, Py)>>;
static CACHE: LazyLock<Mutex<Publications>> = LazyLock::new(|| Mutex::new(HashMap::new()));

fn publication(epub: &FsPath, mtime: i128, size: u64) -> Result<(Py, Py), ()> {
    let key = (epub.to_path_buf(), mtime, size);
    if let Some(hit) = CACHE.lock().unwrap().get(&key) {
        return Ok((hit.0.clone(), hit.1.clone()));
    }
    let built = build_publication(epub).map_err(|_| ())?;
    let mut cache = CACHE.lock().unwrap();
    if cache.len() >= 32
        && let Some(oldest) = cache.keys().next().cloned()
    {
        cache.remove(&oldest);
    }
    cache.insert(key, Arc::new((built.0.clone(), built.1.clone())));
    Ok(built)
}

// ── zip + XML ────────────────────────────────────────────────────────────────────────────────────────────────────────
struct Node {
    ns: Option<String>,
    local: String,
    attrs: Vec<(Option<String>, String, String)>,
    children: Vec<usize>,
    parent: Option<usize>,
    text: String,
    tail: String,
}

struct Doc {
    nodes: Vec<Node>,
    root: usize,
}

impl Doc {
    fn is(&self, index: usize, ns: &str, local: &str) -> bool {
        self.nodes[index].ns.as_deref() == Some(ns) && self.nodes[index].local == local
    }

    fn attr(&self, index: usize, local: &str) -> Option<&str> {
        self.nodes[index]
            .attrs
            .iter()
            .find(|(_, name, _)| name == local)
            .map(|(_, _, value)| value.as_str())
    }

    fn attr_ns(&self, index: usize, ns: &str, local: &str) -> Option<&str> {
        self.nodes[index]
            .attrs
            .iter()
            .find(|(uri, name, _)| uri.as_deref() == Some(ns) && name == local)
            .map(|(_, _, value)| value.as_str())
    }

    fn child(&self, index: usize, ns: &str, local: &str) -> Option<usize> {
        self.nodes[index]
            .children
            .iter()
            .copied()
            .find(|&child| self.is(child, ns, local))
    }

    fn children(&self, index: usize, ns: &str, local: &str) -> Vec<usize> {
        self.nodes[index]
            .children
            .iter()
            .copied()
            .filter(|&child| self.is(child, ns, local))
            .collect()
    }

    /// `iter()`: pre-order, the node itself first.
    fn iter(&self, start: usize) -> Vec<usize> {
        let mut out = vec![start];
        let mut index = 0;
        while index < out.len() {
            out.extend(self.nodes[out[index]].children.iter().copied());
            index += 1;
        }
        out
    }

    fn descendant(&self, start: usize, ns: &str, local: &str) -> Option<usize> {
        self.iter(start)
            .into_iter()
            .skip(1)
            .find(|&node| self.is(node, ns, local))
    }

    /// `" ".join("".join(node.itertext()).split())`.
    fn collapsed_text(&self, index: Option<usize>) -> String {
        let Some(index) = index else {
            return String::new();
        };
        let mut raw = String::new();
        self.collect_text(index, &mut raw);
        raw.split_whitespace().collect::<Vec<_>>().join(" ")
    }

    fn collect_text(&self, index: usize, out: &mut String) {
        out.push_str(&self.nodes[index].text);
        for &child in &self.nodes[index].children {
            self.collect_text(child, out);
            out.push_str(&self.nodes[child].tail);
        }
    }
}

/// Parse XML with the namespace resolution lxml applies (`_parser` has entity resolution off and no recovery).
fn parse_xml(bytes: &[u8]) -> Option<Doc> {
    let mut reader = NsReader::from_reader(bytes);
    reader.config_mut().trim_text(false);
    let mut nodes: Vec<Node> = Vec::new();
    let mut stack: Vec<usize> = Vec::new();
    let mut root = None;
    loop {
        let (resolved, event) = reader.read_resolved_event().ok()?;
        let opens = matches!(event, Event::Start(_));
        match event {
            Event::Start(start) | Event::Empty(start) => {
                let ns = match &resolved {
                    quick_xml::name::ResolveResult::Bound(ns) => {
                        Some(String::from_utf8_lossy(ns.as_ref()).into_owned())
                    }
                    _ => None,
                };
                let local = String::from_utf8_lossy(start.local_name().as_ref()).into_owned();
                let mut attrs = Vec::new();
                for attr in start.attributes().with_checks(false).flatten() {
                    let key = String::from_utf8_lossy(attr.key.as_ref()).into_owned();
                    // `xmlns` declarations are namespace mechanics, not attributes of the document.
                    if key == "xmlns" || key.starts_with("xmlns:") {
                        continue;
                    }
                    let prefixed = key.contains(':');
                    let name = match key.split_once(':') {
                        Some((_, local)) => local.to_owned(),
                        None => key,
                    };
                    // An unprefixed attribute has no namespace, so this returns Unbound for it.
                    let uri = if prefixed {
                        match reader.resolve_attribute(attr.key).0 {
                            quick_xml::name::ResolveResult::Bound(ns) => {
                                Some(String::from_utf8_lossy(ns.as_ref()).into_owned())
                            }
                            _ => None,
                        }
                    } else {
                        None
                    };
                    // XML attribute-value normalisation: every tab/newline becomes a space (lxml applies it too).
                    let value = String::from_utf8_lossy(&attr.value)
                        .chars()
                        .map(|ch| {
                            if matches!(ch, '\t' | '\n' | '\r') {
                                ' '
                            } else {
                                ch
                            }
                        })
                        .collect();
                    attrs.push((uri, name, value));
                }
                let index = nodes.len();
                nodes.push(Node {
                    ns,
                    local,
                    attrs,
                    children: Vec::new(),
                    parent: stack.last().copied(),
                    text: String::new(),
                    tail: String::new(),
                });
                if let Some(&parent) = stack.last() {
                    nodes[parent].children.push(index);
                } else if root.is_none() {
                    root = Some(index);
                }
                if opens {
                    stack.push(index);
                }
            }
            Event::End(_) => {
                stack.pop();
            }
            Event::Text(text) => {
                let value = normalize_line_endings(&text.decode().ok()?);
                append_text(&mut nodes, &stack, value);
            }
            Event::CData(data) => {
                let value = normalize_line_endings(&String::from_utf8_lossy(&data));
                append_text(&mut nodes, &stack, value);
            }
            Event::GeneralRef(reference) => {
                // quick-xml reports `&amp;` and `&#38;` as their own event; lxml expands the XML predefined ones and
                // numeric character references, and keeps an unknown named entity for the DTD to resolve (which lxml
                // does not, with `resolve_entities=False`), so an unknown name adds nothing.
                if let Some(text) = entity_text(&reference) {
                    append_text(&mut nodes, &stack, text);
                }
            }
            Event::Comment(comment) => {
                // lxml keeps comments as nodes whose text is the comment body; they take part in itertext().
                let value = String::from_utf8_lossy(&comment).into_owned();
                let index = nodes.len();
                nodes.push(Node {
                    ns: None,
                    local: "#comment".to_owned(),
                    attrs: Vec::new(),
                    children: Vec::new(),
                    parent: stack.last().copied(),
                    text: value,
                    tail: String::new(),
                });
                if let Some(&parent) = stack.last() {
                    nodes[parent].children.push(index);
                }
            }
            Event::Eof => break,
            _ => {}
        }
    }
    // Text after a closed element belongs to the parent node's last child as its tail.
    root.map(|root| Doc { nodes, root })
}
/// The text of an XML entity reference: the five predefined names and numeric character references.
fn entity_text(reference: &[u8]) -> Option<String> {
    let name = std::str::from_utf8(reference).ok()?;
    match name {
        "amp" => return Some("&".to_owned()),
        "lt" => return Some("<".to_owned()),
        "gt" => return Some(">".to_owned()),
        "quot" => return Some("\"".to_owned()),
        "apos" => return Some("'".to_owned()),
        _ => {}
    }
    let number = name.strip_prefix('#')?;
    let code = match number
        .strip_prefix('x')
        .or_else(|| number.strip_prefix('X'))
    {
        Some(hex_digits) => u32::from_str_radix(hex_digits, 16).ok()?,
        None => number.parse().ok()?,
    };
    // `0xFFFE`/`0xFFFF` are not characters; lxml rejects them, so the document is not servable from here either.
    char::from_u32(code).map(|ch| ch.to_string())
}

/// XML 1.0 §2.11: a carriage return, `\r\n` or `\r` becomes `\n` before anything reads the text. lxml does this and
/// the EPUB that exposed it (book 3990) has CRLF inside a paragraph, which made Rust count one character too many.
fn normalize_line_endings(text: &str) -> String {
    text.replace("\r\n", "\n").replace('\r', "\n")
}
fn append_text(nodes: &mut [Node], stack: &[usize], value: String) {
    if value.is_empty() {
        return;
    }
    if let Some(&current) = stack.last() {
        if let Some(&last) = nodes[current].children.last() {
            nodes[last].tail.push_str(&value);
        } else {
            nodes[current].text.push_str(&value);
        }
    }
}

fn read_member(archive: &mut zip::ZipArchive<std::fs::File>, name: &str) -> Option<Vec<u8>> {
    let mut file = archive.by_name(name).ok()?;
    let mut data = Vec::new();
    file.read_to_end(&mut data).ok()?;
    Some(data)
}

fn open_epub(path: &FsPath) -> Option<zip::ZipArchive<std::fs::File>> {
    zip::ZipArchive::new(std::fs::File::open(path).ok()?).ok()
}

fn read_xml(archive: &mut zip::ZipArchive<std::fs::File>, name: &str) -> Option<Doc> {
    parse_xml(&read_member(archive, name)?)
}

// ── paths, URLs, media types ─────────────────────────────────────────────────────────────────────────────────────────
fn unquote(text: &str) -> String {
    let bytes = text.as_bytes();
    let mut out: Vec<u8> = Vec::with_capacity(bytes.len());
    let mut index = 0;
    while index < bytes.len() {
        if bytes[index] == b'%'
            && index + 2 < bytes.len()
            && let (Some(high), Some(low)) = (hex(bytes[index + 1]), hex(bytes[index + 2]))
        {
            out.push(high * 16 + low);
            index += 3;
            continue;
        }
        out.push(bytes[index]);
        index += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

fn hex(byte: u8) -> Option<u8> {
    match byte {
        b'0'..=b'9' => Some(byte - b'0'),
        b'a'..=b'f' => Some(byte - b'a' + 10),
        b'A'..=b'F' => Some(byte - b'A' + 10),
        _ => None,
    }
}

/// `urllib.parse.quote(text, safe=safe)`: letters, digits and `_.-~` are always safe, hex is upper case.
fn quote(text: &str, safe: &str) -> String {
    let mut out = String::with_capacity(text.len());
    for byte in text.bytes() {
        let ch = byte as char;
        let always = ch.is_ascii_alphanumeric() || matches!(ch, '_' | '.' | '-' | '~');
        if always || (safe.contains(ch) && byte.is_ascii()) {
            out.push(ch);
        } else {
            out.push_str(&format!("%{byte:02X}"));
        }
    }
    out
}

/// `posixpath.normpath`.
fn normpath(path: &str) -> String {
    if path.is_empty() {
        return ".".to_owned();
    }
    let initial = if path.starts_with('/') { "/" } else { "" };
    let mut parts: Vec<&str> = Vec::new();
    for part in path.split('/') {
        match part {
            "" | "." => {}
            ".." => {
                if parts.last().is_some_and(|last| *last != "..") {
                    parts.pop();
                } else if initial.is_empty() {
                    parts.push("..");
                }
            }
            other => parts.push(other),
        }
    }
    let joined = parts.join("/");
    if initial.is_empty() {
        if joined.is_empty() {
            ".".to_owned()
        } else {
            joined
        }
    } else {
        format!("/{joined}")
    }
}

fn dirname(path: &str) -> String {
    match path.rfind('/') {
        None => String::new(),
        Some(0) => "/".to_owned(),
        Some(index) => {
            let head = &path[..index];
            normpath(head)
        }
    }
}

/// `posixpath.join(base, path)`: an absolute `path` wins.
fn join(base: &str, path: &str) -> String {
    if path.starts_with('/') || base.is_empty() {
        return path.to_owned();
    }
    if base.ends_with('/') {
        format!("{base}{path}")
    } else {
        format!("{base}/{path}")
    }
}

fn resolve(base_dir: &str, href: &str) -> String {
    let path = href.split('#').next().unwrap_or("");
    let path = path.split('?').next().unwrap_or("");
    normpath(&join(base_dir, &unquote(path)))
}

fn href(member: &str, fragment: &str) -> String {
    let base = quote(member, "/");
    if fragment.is_empty() {
        base
    } else {
        format!("{base}#{}", quote(fragment, ""))
    }
}

fn split_extension(member: &str) -> &str {
    let name = member.rsplit('/').next().unwrap_or(member);
    match name.rfind('.') {
        Some(index) if index > 0 => &name[index..],
        _ => "",
    }
}

fn media_type(member: &str) -> &'static str {
    match split_extension(member).to_ascii_lowercase().as_str() {
        ".xhtml" => "application/xhtml+xml",
        ".html" | ".htm" => "text/html",
        ".css" => "text/css",
        ".svg" => "image/svg+xml",
        ".ncx" => "application/x-dtbncx+xml",
        ".otf" => "font/otf",
        ".ttf" => "font/ttf",
        ".woff" => "font/woff",
        ".woff2" => "font/woff2",
        ".webp" => "image/webp",
        // `mimetypes.guess_type` for the common EPUB members.
        ".jpeg" | ".jpg" => "image/jpeg",
        ".png" => "image/png",
        ".gif" => "image/gif",
        ".js" => "text/javascript",
        ".xml" => "application/xml",
        ".smil" => "application/smil+xml",
        ".mp3" => "audio/mpeg",
        ".mp4" => "video/mp4",
        ".ogg" => "audio/ogg",
        ".txt" => "text/plain",
        ".json" => "application/json",
        ".pdf" => "application/pdf",
        _ => "application/octet-stream",
    }
}

// ── publication ─────────────────────────────────────────────────────────────────────────────────────────────────────
struct Item {
    path: String,
    media_type: String,
    properties: Vec<String>,
}

fn build_publication(epub: &FsPath) -> Result<(Py, Py), ()> {
    let mut archive = open_epub(epub).ok_or(())?;
    let (opf_path, opf) = parse_opf(&mut archive).ok_or(())?;
    let base_dir = dirname(&opf_path);

    let mut items: Vec<(String, Item)> = Vec::new();
    if let Some(manifest_index) = opf.child(opf.root, OPF_NS, "manifest") {
        for index in opf.children(manifest_index, OPF_NS, "item") {
            let (Some(id), Some(item_href)) = (opf.attr(index, "id"), opf.attr(index, "href"))
            else {
                continue;
            };
            let item = Item {
                path: resolve(&base_dir, item_href),
                media_type: opf
                    .attr(index, "media-type")
                    .unwrap_or("application/octet-stream")
                    .to_owned(),
                properties: opf
                    .attr(index, "properties")
                    .unwrap_or("")
                    .split_whitespace()
                    .map(str::to_owned)
                    .collect(),
            };
            // dict semantics: a repeated id keeps its first position but the last value.
            if let Some(existing) = items.iter_mut().find(|(key, _)| key == id) {
                existing.1 = item;
            } else {
                items.push((id.to_owned(), item));
            }
        }
    }
    let spine = opf.child(opf.root, OPF_NS, "spine");
    let mut reading_order: Vec<usize> = Vec::new();
    if let Some(spine) = spine {
        for itemref in opf.children(spine, OPF_NS, "itemref") {
            let Some(idref) = opf.attr(itemref, "idref") else {
                continue;
            };
            let Some(position) = items.iter().position(|(key, _)| key == idref) else {
                continue;
            };
            let item = &items[position].1;
            let xhtml = matches!(
                item.media_type.as_str(),
                "application/xhtml+xml" | "text/html"
            );
            if xhtml && opf.attr(itemref, "linear") != Some("no") {
                reading_order.push(position);
            }
        }
    }
    if reading_order.is_empty() {
        return Err(());
    }
    let content_paths: Vec<&str> = reading_order
        .iter()
        .map(|&i| items[i].1.path.as_str())
        .collect();

    let mut toc: Vec<Py> = Vec::new();
    if let Some(position) = items
        .iter()
        .position(|(_, item)| item.properties.iter().any(|property| property == "nav"))
    {
        toc = toc_from_nav(&mut archive, &items[position].1.path, &content_paths);
    }
    if toc.is_empty()
        && let Some(spine) = spine
        && let Some(toc_id) = opf.attr(spine, "toc")
        && let Some(position) = items.iter().position(|(key, _)| key == toc_id)
    {
        toc = toc_from_ncx(&mut archive, &items[position].1.path, &content_paths);
    }

    let mut lengths: Vec<i64> = Vec::new();
    for &position in &reading_order {
        lengths.push(content_length(&mut archive, &items[position].1.path).max(1));
    }
    let total: i64 = lengths.iter().sum();

    let reading: Vec<Py> = reading_order
        .iter()
        .map(|&i| {
            Py::obj([
                ("href", Py::str(href(&items[i].1.path, ""))),
                ("type", Py::str(items[i].1.media_type.clone())),
            ])
        })
        .collect();
    let resources: Vec<Py> = items
        .iter()
        .filter(|(_, item)| {
            !content_paths.contains(&item.path.as_str()) && !item.path.ends_with(".ncx")
        })
        .map(|(_, item)| {
            Py::obj([
                ("href", Py::str(href(&item.path, ""))),
                ("type", Py::str(item.media_type.clone())),
            ])
        })
        .collect();

    let manifest = Py::obj([
        ("@context", Py::str(MANIFEST_CONTEXT)),
        ("metadata", metadata(&opf)),
        ("readingOrder", Py::List(reading)),
        ("resources", Py::List(resources)),
        ("toc", Py::List(toc)),
    ]);

    let mut positions: Vec<Py> = Vec::new();
    let mut number: i64 = 1;
    let mut before: i64 = 0;
    for (index, &position) in reading_order.iter().enumerate() {
        let length = lengths[index];
        let count = (length + POSITION_CHARS - 1) / POSITION_CHARS;
        for inner in 0..count {
            positions.push(Py::obj([
                ("href", Py::str(href(&items[position].1.path, ""))),
                ("type", Py::str(items[position].1.media_type.clone())),
                (
                    "locations",
                    Py::obj([
                        ("position", Py::Int(number)),
                        ("progression", Py::Float(inner as f64 / count as f64)),
                        (
                            "totalProgression",
                            Py::Float(
                                (before as f64 + length as f64 * inner as f64 / count as f64)
                                    / total as f64,
                            ),
                        ),
                    ]),
                ),
            ]));
            number += 1;
        }
        before += length;
    }
    let total_positions = positions.len() as i64;
    Ok((
        manifest,
        Py::obj([
            ("total", Py::Int(total_positions)),
            ("positions", Py::List(positions)),
        ]),
    ))
}

fn parse_opf(archive: &mut zip::ZipArchive<std::fs::File>) -> Option<(String, Doc)> {
    let container = read_xml(archive, "META-INF/container.xml")?;
    let rootfile = container.descendant(container.root, CONTAINER_NS, "rootfile")?;
    let opf_path = container.attr(rootfile, "full-path")?.to_owned();
    let doc = read_xml(archive, &opf_path)?;
    Some((opf_path, doc))
}

fn metadata(opf: &Doc) -> Py {
    let meta = opf.child(opf.root, OPF_NS, "metadata");
    let values = |name: &str| -> Vec<String> {
        let Some(meta) = meta else {
            return Vec::new();
        };
        opf.children(meta, DC_NS, name)
            .into_iter()
            .map(|node| opf.collapsed_text(Some(node)))
            .filter(|text| !text.is_empty())
            .collect()
    };
    let title = values("title")
        .into_iter()
        .next()
        .unwrap_or_else(|| "Untitled".to_owned());
    let mut pairs: Vec<(&'static str, Py)> = vec![
        ("title", Py::str(title)),
        ("@type", Py::str("http://schema.org/Book")),
        ("conformsTo", Py::str(EPUB_PROFILE)),
    ];
    if let Some(identifier) = values("identifier").into_iter().next() {
        pairs.push(("identifier", Py::str(identifier)));
    }
    let languages = values("language");
    if !languages.is_empty() {
        pairs.push((
            "language",
            Py::List(languages.into_iter().map(Py::Str).collect()),
        ));
    }
    let creators = values("creator");
    if !creators.is_empty() {
        pairs.push((
            "author",
            Py::List(
                creators
                    .into_iter()
                    .map(|name| Py::obj([("name", Py::Str(name))]))
                    .collect(),
            ),
        ));
    }
    let publishers = values("publisher");
    if !publishers.is_empty() {
        pairs.push((
            "publisher",
            Py::List(
                publishers
                    .into_iter()
                    .map(|name| Py::obj([("name", Py::Str(name))]))
                    .collect(),
            ),
        ));
    }
    if let Some(description) = values("description").into_iter().next() {
        pairs.push(("description", Py::str(description)));
    }
    let mut layout = None;
    if let Some(meta) = meta {
        for node in opf.children(meta, OPF_NS, "meta") {
            if opf.attr(node, "property") == Some("rendition:layout") {
                layout = Some(opf.collapsed_text(Some(node)));
            }
        }
    }
    if layout.as_deref() == Some("pre-paginated") {
        pairs.push(("layout", Py::str("fixed")));
    }
    let direction = opf
        .child(opf.root, OPF_NS, "spine")
        .and_then(|spine| opf.attr(spine, "page-progression-direction"));
    if matches!(direction, Some("ltr" | "rtl")) {
        pairs.push(("readingProgression", Py::str(direction.unwrap_or(""))));
    }
    Py::Object(
        pairs
            .into_iter()
            .map(|(key, value)| (key.to_owned(), value))
            .collect(),
    )
}

fn toc_link(base_dir: &str, raw_href: Option<&str>, title: String, content: &[&str]) -> Option<Py> {
    let raw_href = raw_href?;
    if raw_href.is_empty() {
        return None;
    }
    let member = resolve(base_dir, raw_href);
    if !content.contains(&member.as_str()) {
        return None;
    }
    let fragment = match raw_href.split_once('#') {
        Some((_, fragment)) => unquote(fragment),
        None => String::new(),
    };
    Some(Py::obj([
        ("title", Py::Str(title)),
        ("href", Py::Str(href(&member, &fragment))),
    ]))
}

fn with_children(mut link: Py, children: Vec<Py>) -> Py {
    if !children.is_empty()
        && let Py::Object(ref mut pairs) = link
    {
        pairs.push(("children".to_owned(), Py::List(children)));
    }
    link
}

fn nav_list(doc: &Doc, ol: Option<usize>, base_dir: &str, content: &[&str]) -> Vec<Py> {
    let Some(ol) = ol else {
        return Vec::new();
    };
    let mut items = Vec::new();
    for li in doc.children(ol, XHTML_NS, "li") {
        let anchor = doc
            .child(li, XHTML_NS, "a")
            .or_else(|| doc.child(li, XHTML_NS, "span"));
        let children = nav_list(doc, doc.child(li, XHTML_NS, "ol"), base_dir, content);
        let title = doc.collapsed_text(anchor);
        let raw_href = anchor.and_then(|anchor| doc.attr(anchor, "href"));
        match toc_link(base_dir, raw_href, title, content) {
            None if !children.is_empty() => items.extend(children),
            None => {}
            Some(link) => items.push(with_children(link, children)),
        }
    }
    items
}

fn toc_from_nav(
    archive: &mut zip::ZipArchive<std::fs::File>,
    nav_path: &str,
    content: &[&str],
) -> Vec<Py> {
    let Some(doc) = read_xml(archive, nav_path) else {
        return Vec::new();
    };
    let base_dir = dirname(nav_path);
    for nav in doc.iter(doc.root) {
        if doc.is(nav, XHTML_NS, "nav") && doc.attr_ns(nav, OPS_NS, "type") == Some("toc") {
            return nav_list(&doc, doc.child(nav, XHTML_NS, "ol"), &base_dir, content);
        }
    }
    Vec::new()
}

fn ncx_points(doc: &Doc, parent: usize, base_dir: &str, content: &[&str]) -> Vec<Py> {
    let mut items = Vec::new();
    for point in doc.children(parent, NCX_NS, "navPoint") {
        let label_node = doc
            .child(point, NCX_NS, "navLabel")
            .and_then(|label| doc.child(label, NCX_NS, "text"));
        let label = doc.collapsed_text(label_node);
        let src = doc
            .child(point, NCX_NS, "content")
            .and_then(|content| doc.attr(content, "src"));
        let children = ncx_points(doc, point, base_dir, content);
        match toc_link(base_dir, src, label, content) {
            None if !children.is_empty() => items.extend(children),
            None => {}
            Some(link) => items.push(with_children(link, children)),
        }
    }
    items
}

fn toc_from_ncx(
    archive: &mut zip::ZipArchive<std::fs::File>,
    ncx_path: &str,
    content: &[&str],
) -> Vec<Py> {
    let Some(doc) = read_xml(archive, ncx_path) else {
        return Vec::new();
    };
    match doc.child(doc.root, NCX_NS, "navMap") {
        Some(nav_map) => ncx_points(&doc, nav_map, &dirname(ncx_path), content),
        None => Vec::new(),
    }
}

fn content_length(archive: &mut zip::ZipArchive<std::fs::File>, member: &str) -> i64 {
    let parsed = read_member(archive, member).and_then(|bytes| parse_xml(&bytes));
    let Some(doc) = parsed else {
        return 0;
    };
    let Some(body) = doc.descendant(doc.root, XHTML_NS, "body") else {
        return 0;
    };
    let skipped =
        |index: usize| doc.is(index, XHTML_NS, "script") || doc.is(index, XHTML_NS, "style");
    let mut chars = 0i64;
    for node in doc.iter(body) {
        if skipped(node) {
            continue;
        }
        chars += doc.nodes[node].text.trim().chars().count() as i64;
        let tail = &doc.nodes[node].tail;
        let parent_skipped = doc.nodes[node].parent.is_some_and(skipped);
        if !parent_skipped {
            chars += tail.trim().chars().count() as i64;
        }
    }
    chars
}

// ── resources ────────────────────────────────────────────────────────────────────────────────────────────────────────
/// `read_resource`: the member's exact bytes when it carries no active content; `Rewrite` when Flask must sanitise it.
fn read_resource(epub: &FsPath, member: &str) -> Result<(Vec<u8>, &'static str), ()> {
    if member.is_empty()
        || member.starts_with('/')
        || member.split('/').any(|part| part == "..")
        || member.contains('\\')
        || member.contains('\0')
    {
        return Err(());
    }
    let mut archive = open_epub(epub).ok_or(())?;
    let (size, is_dir) = {
        let info = archive.by_name(member).map_err(|_| ())?;
        (info.size(), info.is_dir())
    };
    if is_dir || size > MAX_RESOURCE_BYTES {
        return Err(());
    }
    let data = read_member(&mut archive, member).ok_or(())?;
    let media_type = media_type(member);
    let xhtml = matches!(media_type, "application/xhtml+xml" | "text/html");
    if media_type == "text/html" {
        // libxml's HTML parser is not the XML parser; let Flask own that sanitising.
        return Err(());
    }
    if xhtml || media_type == "image/svg+xml" {
        match parse_xml(&data) {
            // Unparsable markup is a 404 in Flask (`strip_active_content` returns None), which is also a proxy.
            None => return Err(()),
            Some(doc) => {
                if has_active_content(&doc) {
                    return Err(());
                }
            }
        }
    }
    Ok((data, media_type))
}

fn has_active_content(doc: &Doc) -> bool {
    for index in doc.iter(doc.root) {
        if doc.nodes[index].local.eq_ignore_ascii_case("script") {
            return true;
        }
        for (_, name, value) in &doc.nodes[index].attrs {
            let local = name.to_ascii_lowercase();
            if local.starts_with("on") || local == "srcdoc" {
                return true;
            }
            if matches!(
                local.as_str(),
                "href" | "src" | "action" | "formaction" | "data"
            ) {
                let collapsed: String = value
                    .chars()
                    .filter(|ch| !ch.is_whitespace() && !(*ch <= '\u{1f}'))
                    .collect();
                if collapsed.to_ascii_lowercase().starts_with("javascript:") {
                    return true;
                }
            }
        }
    }
    false
}

#[cfg(test)]
mod tests {
    use super::{dirname, href, normpath, quote, resolve, unquote};

    #[test]
    fn paths_and_urls_match_posixpath_and_urllib() {
        assert_eq!(normpath("OPS/./text/../images/x.png"), "OPS/images/x.png");
        assert_eq!(normpath(""), ".");
        assert_eq!(normpath("../a"), "../a");
        assert_eq!(dirname("OPS/content.opf"), "OPS");
        assert_eq!(dirname("content.opf"), "");
        assert_eq!(
            resolve("OPS", "text/ch%201.xhtml?x=1#frag"),
            "OPS/text/ch 1.xhtml"
        );
        assert_eq!(quote("a b/c%d#e", "/"), "a%20b/c%25d%23e");
        assert_eq!(quote("fr ag", ""), "fr%20ag");
        assert_eq!(href("OPS/a b.xhtml", "ar g"), "OPS/a%20b.xhtml#ar%20g");
        assert_eq!(unquote("a%20b%C3%A9"), "a bé");
        assert_eq!(unquote("100%"), "100%");
    }
}
