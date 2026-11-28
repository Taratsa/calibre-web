//! Metadata read from an uploaded file: the port of `cps/epub.py: get_epub_info` and `cps/uploader.py: pdf_meta` for the
//! two formats the upload bot sends. `ebook-meta` is not in the image, so the files are read here: the EPUB through its
//! OPF (zip + XML), the PDF through its XMP packet, with the Info dictionary as the fallback exactly as Flask orders it.
//!
//! The XML tree is `readium::parse_xml`. Namespaces are matched by LOCAL NAME only: Dublin Core declarations in the wild
//! bind `dc:` to different URIs, and Flask's XPath already resolves them by prefix.
//!
//! Covers come back as bytes with their extension; the caller converts (Flask converts with ImageMagick, the same
//! `convert` binary this image ships). A PDF's cover is a rendered first page, so nothing is read here.

use crate::readium::{Doc, parse_xml};
use std::io::Read;
use std::path::Path;

/// Flask's `_("Unknown")` fallback for an empty author.
pub const UNKNOWN_AUTHOR: &str = "Unknown";

#[derive(Debug, Default, PartialEq, Eq)]
pub struct Meta {
    pub title: String,
    pub author: String,
    pub description: String,
    pub tags: String,
    pub series: String,
    pub series_id: String,
    /// ISO 639-3 codes, as Flask stores them (`get_lang3`).
    pub languages: Vec<String>,
    pub publisher: String,
    /// `YYYY-MM-DD`, or empty.
    pub pubdate: String,
    pub identifiers: Vec<(String, String)>,
    pub cover: Option<Cover>,
}

#[derive(Debug, PartialEq, Eq)]
pub struct Cover {
    /// Lower case, no dot: `jpg`, `jpeg`, `png`, `webp` or `bmp`.
    pub extension: String,
    pub bytes: Vec<u8>,
}

/// `helper.split_authors`: split on `&`/`;`, turn `Last, First` into `First Last`, keep several commas apart.
pub fn split_authors(values: &[String]) -> Vec<String> {
    let mut out = Vec::new();
    for value in values {
        for author in value.split(['&', ';']) {
            match author.matches(',').count() {
                1 => {
                    let (last, first) = author.split_once(',').unwrap_or((author, ""));
                    out.push(format!(
                        "{} {}",
                        crate::filename::strip_whitespaces(first),
                        crate::filename::strip_whitespaces(last)
                    ));
                }
                n if n > 1 => out.extend(
                    author
                        .split(',')
                        .map(|part| crate::filename::strip_whitespaces(part).to_owned()),
                ),
                _ => out.push(crate::filename::strip_whitespaces(author).to_owned()),
            }
        }
    }
    out
}

/// `string_helper.normalize_pubdate`: a year, `YYYY-MM` or a full date (a time after it is ignored) becomes
/// `YYYY-MM-DD`; anything else, including an impossible day, becomes empty.
pub fn normalize_pubdate(value: &str) -> String {
    static PATTERN: std::sync::LazyLock<regex::Regex> = std::sync::LazyLock::new(|| {
        regex::Regex::new(r"^\s*(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?").expect("pattern")
    });
    let Some(caps) = PATTERN.captures(value) else {
        return String::new();
    };
    // Python's `(?![\d])`: the date must not be followed by another digit ("12345" is not a year).
    let matched = caps.get(0).map_or(0, |m| m.end());
    if value[matched..].starts_with(|c: char| c.is_ascii_digit()) {
        return String::new();
    }
    let month = caps.get(2).map_or("01", |m| m.as_str());
    let day = caps.get(3).map_or("01", |d| d.as_str());
    let text = format!("{}-{month}-{day}", &caps[1]);
    match chrono::NaiveDate::parse_from_str(&text, "%Y-%m-%d") {
        Ok(_) => text,
        Err(_) => String::new(),
    }
}

/// `isoLanguages.get_lang3`: a two-letter code becomes its ISO 639-3 form (`en` -> `eng`), a three-letter code stays.
pub fn lang3(code: &str) -> String {
    let code = code.trim().to_lowercase();
    if code.len() == 3 {
        return code;
    }
    isolang::Language::from_639_1(&code)
        .and_then(|language| language.to_639_3().to_owned().into())
        .unwrap_or_default()
}

/// Every text below `index`, whitespace-collapsed (`" ".join("".join(node.itertext()).split())` for a list entry).
fn collapsed(doc: &Doc, index: usize) -> String {
    let mut raw = String::new();
    for node in doc.iter(index) {
        raw.push_str(doc.node_text(node));
    }
    raw.split_whitespace().collect::<Vec<_>>().join(" ")
}

/// The direct children of `index` whose local name is `local`, whatever their namespace.
fn children_local(doc: &Doc, index: usize, local: &str) -> Vec<usize> {
    // `Doc::children` needs a namespace; a namespace-free traversal is `iter` filtered by parent depth is not exposed,
    // so this walks the whole subtree and keeps the nodes whose local name matches at any depth (metadata elements are
    // leaves).
    doc.iter(index)
        .into_iter()
        .skip(1)
        .filter(|node| doc.local(*node) == local)
        .collect()
}

fn read_member(archive: &mut zip::ZipArchive<std::fs::File>, name: &str) -> Option<Vec<u8>> {
    let mut file = archive.by_name(name).ok()?;
    let mut data = Vec::new();
    file.read_to_end(&mut data).ok()?;
    Some(data)
}

/// The OPF path from `META-INF/container.xml`.
fn opf_path(archive: &mut zip::ZipArchive<std::fs::File>) -> Option<String> {
    let data = read_member(archive, "META-INF/container.xml")?;
    let doc = parse_xml(&data)?;
    let rootfile = doc
        .iter(doc.root())
        .into_iter()
        .find(|node| doc.local(*node) == "rootfile")?;
    doc.attr(rootfile, "full-path").map(str::to_owned)
}

fn join_dir(base: &str, href: &str) -> String {
    let href = href.replace('\\', "/");
    if base.is_empty() {
        return href;
    }
    format!(
        "{}/{}",
        base.trim_end_matches('/'),
        href.trim_start_matches('/')
    )
}

fn dir_of(path: &str) -> String {
    match path.rsplit_once('/') {
        Some((dir, _)) => dir.to_owned(),
        None => String::new(),
    }
}

fn extension_of(href: &str) -> String {
    href.rsplit_once('.')
        .map(|(_, ext)| ext.to_lowercase())
        .unwrap_or_default()
}

/// `epub.get_epub_info` for a file on disk.
pub fn epub(path: &Path) -> Result<Meta, String> {
    let file = std::fs::File::open(path).map_err(|error| error.to_string())?;
    let mut archive = zip::ZipArchive::new(file).map_err(|error| error.to_string())?;
    let opf = opf_path(&mut archive).ok_or("no META-INF/container.xml rootfile")?;
    let data = read_member(&mut archive, &opf).ok_or("the OPF is missing from the archive")?;
    let doc = parse_xml(&data).ok_or("the OPF cannot be parsed")?;
    let root = doc.root();
    let metadata = doc
        .iter(root)
        .into_iter()
        .skip(1)
        .find(|node| doc.local(*node) == "metadata")
        .unwrap_or(root);

    let values = |local: &str| -> Vec<String> {
        children_local(&doc, metadata, local)
            .into_iter()
            .map(|node| crate::filename::strip_whitespaces(&collapsed(&doc, node)).to_owned())
            .collect()
    };
    let first = |local: &str| values(local).into_iter().next().unwrap_or_default();

    let series = children_local(&doc, metadata, "meta")
        .into_iter()
        .find(|node| doc.attr(*node, "name") == Some("calibre:series"))
        .and_then(|node| doc.attr(node, "content"))
        .map_or(String::new(), str::to_owned);
    let series_id = children_local(&doc, metadata, "meta")
        .into_iter()
        .find(|node| doc.attr(*node, "name") == Some("calibre:series_index"))
        .and_then(|node| doc.attr(node, "content"))
        .map_or_else(|| "1".to_owned(), str::to_owned);

    // Identifiers: Flask takes the LAST attribute's value as the type (`opf:scheme="ISBN"`, or `id="bookid"`) and the
    // element text as the value, and skips uuid/calibre.
    let mut identifiers = Vec::new();
    for node in doc.iter(root).into_iter().skip(1) {
        if doc.local(node) != "identifier" {
            continue;
        }
        let Some(kind) = doc
            .attr_values(node)
            .last()
            .map(|value| (*value).to_owned())
        else {
            continue;
        };
        let value = collapsed(&doc, node);
        if kind.is_empty() || value.is_empty() || kind == "uuid" || kind == "calibre" {
            continue;
        }
        identifiers.push((kind, value));
    }

    let cover = cover_image(&doc, &mut archive, &opf);

    let creators = values("creator");
    let author = split_authors(&creators).join(" & ");
    let languages: Vec<String> = values("language")
        .iter()
        .filter_map(|value| {
            let code = value.split('-').next().unwrap_or("").to_lowercase();
            let code3 = lang3(&code);
            (!code3.is_empty()).then_some(code3)
        })
        .collect();
    let mut description = first("description");
    if description.is_empty() {
        // `//*[local-name() = 'description']/text()`: the first description anywhere.
        description = doc
            .iter(root)
            .into_iter()
            .skip(1)
            .filter(|node| doc.local(*node) == "description")
            .map(|node| collapsed(&doc, node))
            .find(|text| !text.is_empty())
            .unwrap_or_default();
    }
    let date = first("date");
    Ok(Meta {
        title: first("title"),
        author,
        description,
        tags: values("subject").join(", "),
        series,
        series_id,
        languages,
        publisher: first("publisher"),
        pubdate: normalize_pubdate(&date[..date.len().min(10)]),
        identifiers,
        cover,
    })
}

/// A member path with `.` and `..` resolved (`os.path.relpath` of a joined path).
fn normalize_path(path: &str) -> String {
    let mut parts: Vec<&str> = Vec::new();
    for part in path.split('/') {
        match part {
            "" | "." => {}
            ".." => {
                parts.pop();
            }
            other => parts.push(other),
        }
    }
    parts.join("/")
}

fn read_cover(archive: &mut zip::ZipArchive<std::fs::File>, member: &str) -> Option<Cover> {
    let extension = extension_of(member);
    if !["jpg", "jpeg", "png", "webp", "bmp"].contains(&extension.as_str()) {
        return None;
    }
    let bytes = read_member(archive, member)?;
    Some(Cover { extension, bytes })
}

/// `epub.parse_epub_cover`: the manifest item `cover-image`, else the item named by `<meta name="cover">`, else the
/// guide's references; a reference to a page is followed to its first `<img src>` (or any `href` attribute).
fn cover_image(
    doc: &Doc,
    archive: &mut zip::ZipArchive<std::fs::File>,
    opf: &str,
) -> Option<Cover> {
    let root = doc.root();
    let base = dir_of(opf);
    let items: Vec<(Option<String>, Option<String>)> = doc
        .iter(root)
        .into_iter()
        .skip(1)
        .filter(|node| doc.local(*node) == "item")
        .map(|node| {
            (
                doc.attr(node, "id").map(str::to_owned),
                doc.attr(node, "href").map(str::to_owned),
            )
        })
        .collect();
    let mut candidates: Vec<String> = items
        .iter()
        .filter(|(id, _)| id.as_deref() == Some("cover-image"))
        .filter_map(|(_, href)| href.clone())
        .collect();
    let meta_cover = children_local(doc, root, "meta")
        .into_iter()
        .find(|node| doc.attr(*node, "name") == Some("cover"))
        .and_then(|node| doc.attr(node, "content").map(str::to_owned));
    if let Some(wanted) = meta_cover {
        candidates.extend(
            items
                .iter()
                .filter(|(id, _)| id.as_deref() == Some(wanted.as_str()))
                .filter_map(|(_, href)| href.clone()),
        );
        candidates.extend(
            doc.iter(root)
                .into_iter()
                .skip(1)
                .filter(|node| {
                    doc.local(*node) == "item"
                        && doc.attr(*node, "properties") == Some(wanted.as_str())
                })
                .filter_map(|node| doc.attr(node, "href").map(str::to_owned)),
        );
    } else {
        candidates.extend(
            doc.iter(root)
                .into_iter()
                .skip(1)
                .filter(|node| doc.local(*node) == "reference")
                .filter_map(|node| doc.attr(node, "href").map(str::to_owned)),
        );
    }
    for href in candidates {
        let lower = href.to_lowercase();
        if lower.ends_with(".xhtml") || lower.ends_with(".html") {
            let page = join_dir(&base, &href);
            let Some(markup) = read_member(archive, &page) else {
                continue;
            };
            let Some(page_doc) = parse_xml(&markup) else {
                continue;
            };
            let source = page_doc
                .iter(page_doc.root())
                .into_iter()
                .skip(1)
                .find(|node| page_doc.local(*node) == "img")
                .and_then(|node| page_doc.attr(node, "src").map(str::to_owned))
                .or_else(|| {
                    page_doc
                        .iter(page_doc.root())
                        .into_iter()
                        .skip(1)
                        .flat_map(|node| page_doc.attrs(node))
                        .find(|(name, _)| name.contains("href"))
                        .map(|(_, value)| value.to_owned())
                });
            if let Some(source) = source {
                let member = normalize_path(&format!("{}/{source}", dir_of(&page)));
                if let Some(cover) = read_cover(archive, &member) {
                    return Some(cover);
                }
            }
            continue;
        }
        if let Some(cover) = read_cover(archive, &join_dir(&base, &href)) {
            return Some(cover);
        }
    }
    None
}

fn stream_text(object: &lopdf::Object) -> Option<String> {
    let stream = object.as_stream().ok()?;
    if stream.dict.get(b"Subtype").ok()?.as_name().ok()? != b"XML" {
        return None;
    }
    let bytes = stream.decompressed_content().ok()?;
    Some(String::from_utf8_lossy(&bytes).into_owned())
}

/// PDF text strings: UTF-16BE/LE when the byte-order mark says so, PDFDocEncoding otherwise (read as Latin-1, which is
/// its ASCII range plus the accented letters the libraries actually carry).
fn pdf_text(bytes: &[u8]) -> String {
    match bytes {
        [0xFE, 0xFF, rest @ ..] => String::from_utf16_lossy(
            &rest
                .chunks(2)
                .map(|pair| u16::from_be_bytes([pair[0], *pair.get(1).unwrap_or(&0)]))
                .collect::<Vec<_>>(),
        ),
        [0xFF, 0xFE, rest @ ..] => String::from_utf16_lossy(
            &rest
                .chunks(2)
                .map(|pair| u16::from_le_bytes([*pair.get(1).unwrap_or(&0), pair[0]]))
                .collect::<Vec<_>>(),
        ),
        _ => bytes.iter().map(|byte| char::from(*byte)).collect(),
    }
}

/// Every XMP packet of a PDF, in document order (`pypdf` merges the packets it finds the same way).
fn xmp_packets(document: &lopdf::Document) -> Vec<String> {
    document
        .objects
        .values()
        .filter_map(stream_text)
        .filter(|text| text.contains("<x:xmpmeta"))
        .collect()
}

/// `pdf_meta` for a file on disk.
pub fn pdf(path: &Path) -> Result<Meta, String> {
    let document = lopdf::Document::load(path).map_err(|error| error.to_string())?;

    // XMP first, like Flask: pypdf's `xmp_metadata` wins over the Info dictionary. A file can carry more than one
    // packet; the first non-empty value of a field wins (`pypdf` merges them).
    let mut xmp = Meta::default();
    for text in xmp_packets(&document) {
        let Some(doc) = parse_xml(text.as_bytes()) else {
            continue;
        };
        let root = doc.root();
        // Flask hands pypdf's XMP values through as they are, spaces included; only emptiness is checked.
        let entries = |local: &str| -> Vec<String> {
            doc.iter(root)
                .into_iter()
                .skip(1)
                .filter(|node| doc.local(*node) == local)
                .map(|node| {
                    // The packet is indented; the value is the text with its edges trimmed (pypdf strips too) and its
                    // inner spacing left alone.
                    doc.iter(node)
                        .into_iter()
                        .map(|inner| doc.node_text(inner))
                        .collect::<String>()
                        .trim()
                        .to_owned()
                })
                .filter(|text| !text.trim().is_empty())
                .collect()
        };
        let fill = |slot: &mut String, values: Vec<String>| {
            if slot.is_empty()
                && let Some(first) = values.into_iter().next()
            {
                *slot = first;
            }
        };
        fill(&mut xmp.title, entries("title"));
        fill(&mut xmp.description, entries("description"));
        if xmp.author.is_empty() {
            let creators = entries("creator");
            xmp.author = split_authors(&creators).join(" & ");
        }
        if xmp.tags.is_empty() {
            xmp.tags = entries("subject").join(", ");
        }
        fill(&mut xmp.publisher, entries("publisher"));
        if xmp.languages.is_empty() {
            xmp.languages = entries("language")
                .iter()
                .map(|code| lang3(code.split('-').next().unwrap_or(code)))
                .filter(|code| !code.is_empty())
                .collect();
        }
        if xmp.pubdate.is_empty() {
            let date = entries("date").into_iter().next().unwrap_or_default();
            let created = if date.is_empty() {
                entries("CreateDate").into_iter().next().unwrap_or_default()
            } else {
                date
            };
            xmp.pubdate = normalize_pubdate(&created);
        }
    }

    // Info dictionary: the fallback for empty fields only.
    let mut info = Meta::default();
    if let Ok(info_ref) = document.trailer.get(b"Info")
        && let Some(resolved) = if info_ref.as_dict().is_ok() {
            Some(std::borrow::Cow::Borrowed(info_ref))
        } else {
            info_ref
                .as_reference()
                .ok()
                .and_then(|id| document.get_object(id).ok())
                .map(std::borrow::Cow::Borrowed)
        }
        && let Ok(dict) = resolved.as_dict()
    {
        let text = |key: &[u8]| -> String {
            dict.get(key)
                .ok()
                .and_then(|value| {
                    value.as_str().ok().map(pdf_text).or_else(|| {
                        value
                            .as_name()
                            .ok()
                            .map(|name| String::from_utf8_lossy(name).into_owned())
                    })
                })
                .unwrap_or_default()
        };
        info.title = text(b"Title");
        info.author = split_authors(&[text(b"Author")]).join(" & ");
        info.description = text(b"Subject");
        info.tags = text(b"Keywords");
    }

    let mut meta = xmp;
    if meta.author.is_empty() {
        meta.author = if info.author.is_empty() {
            String::new()
        } else {
            info.author
        };
    }
    if meta.title.is_empty() {
        meta.title = info.title;
    }
    if meta.description.is_empty() {
        meta.description = info.description;
    }
    if meta.tags.is_empty() {
        meta.tags = info.tags;
    }
    Ok(meta)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn authors_split_and_flip_last_first() {
        assert_eq!(split_authors(&["Doe, John".into()]), vec!["John Doe"]);
        assert_eq!(split_authors(&["A & B".into()]), vec!["A", "B"]);
        assert_eq!(split_authors(&["A, B, C".into()]), vec!["A", "B", "C"]);
        assert_eq!(
            split_authors(&["Tan Malaka; Sutan Sjahrir".into()]),
            vec!["Tan Malaka", "Sutan Sjahrir"]
        );
        assert_eq!(split_authors(&["  Spaced  ".into()]), vec!["Spaced"]);
    }

    #[test]
    fn pubdates_normalise_like_flask() {
        assert_eq!(normalize_pubdate("2013"), "2013-01-01");
        assert_eq!(normalize_pubdate("2013-07"), "2013-07-01");
        assert_eq!(normalize_pubdate("2013-07-09T10:00:00Z"), "2013-07-09");
        assert_eq!(
            normalize_pubdate("2013-13-01"),
            "",
            "an impossible month is refused"
        );
        assert_eq!(
            normalize_pubdate("12345"),
            "",
            "a five-digit year is not a year"
        );
        assert_eq!(normalize_pubdate(""), "");
        assert_eq!(
            normalize_pubdate("tahun 2013"),
            "",
            "the date must start the string"
        );
    }

    #[test]
    fn language_codes_become_iso_639_3() {
        assert_eq!(lang3("en"), "eng");
        assert_eq!(lang3("id"), "ind");
        assert_eq!(lang3("nl"), "nld");
        assert_eq!(lang3("eng"), "eng");
        assert_eq!(lang3("xx"), "");
    }
}
