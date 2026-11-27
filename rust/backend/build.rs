//! Build-time inputs that live in the Flask code, so the two cannot drift apart:
//! - `cps/templates/readpdf.html` is embedded by `src/reader.rs` (include_str!), so a template change rebuilds.
//! - the OCR cache version constants of `cps/ocr_service.py` build the cache file names `src/ocr_status.rs` looks up.
//!   A bump there changes every cache key; reading the numbers here means the Rust binary follows it on the next build
//!   instead of silently answering "not available" for every book.

use std::path::PathBuf;

fn constant(source: &str, name: &str) -> u32 {
    source
        .lines()
        .find_map(|line| {
            let (left, right) = line.split_once('=')?;
            (left.trim() == name).then(|| right.trim().parse().ok())?
        })
        .unwrap_or_else(|| panic!("{name} not found in cps/ocr_service.py"))
}

fn main() {
    let root = PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").unwrap()).join("../..");
    println!("cargo:rerun-if-changed=../../cps/templates/readpdf.html");
    let path = root.join("cps/ocr_service.py");
    println!("cargo:rerun-if-changed=../../cps/ocr_service.py");
    let source = std::fs::read_to_string(&path)
        .unwrap_or_else(|error| panic!("cannot read {}: {error}", path.display()));
    for name in [
        "CACHE_VERSION",
        "EPUB_EXTRACT_VERSION",
        "PDF_LAYOUT_VERSION",
    ] {
        println!("cargo:rustc-env=OCR_{name}={}", constant(&source, name));
    }
}
