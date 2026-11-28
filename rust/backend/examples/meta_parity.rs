//! Print the metadata `meta::epub`/`meta::pdf` read from a file, for comparison with Flask's `uploader.process`:
//!   cargo run --release --example meta_parity -- <file>...
use taratsa_backend::meta;
fn main() {
    for path in std::env::args().skip(1) {
        let file = std::path::Path::new(&path);
        let ext = file
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_lowercase();
        let read = match ext.as_str() {
            "epub" | "kepub" => meta::epub(file),
            "pdf" => meta::pdf(file),
            other => Err(format!("unsupported {other}")),
        };
        println!(
            "{}",
            serde_json::json!({
                "file": path,
                "result": match read {
                    Ok(m) => serde_json::json!({
                        "title": m.title, "author": m.author, "description": m.description, "tags": m.tags,
                        "series": m.series, "series_id": m.series_id, "languages": m.languages,
                        "publisher": m.publisher, "pubdate": m.pubdate, "identifiers": m.identifiers,
                        "cover": m.cover.as_ref().map(|c| (c.extension.clone(), c.bytes.len())),
                    }),
                    Err(e) => serde_json::json!({ "error": e }),
                }
            })
        );
    }
}
