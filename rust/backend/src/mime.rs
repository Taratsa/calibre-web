//! `mimetypes.types_map.get("." + format, "application/octet-stream")` as configured in `cps/__init__.py`:
//! the standard-library table plus the e-book types Calibre-Web registers.

pub fn for_format(book_format: &str) -> &'static str {
    match book_format {
        "pdf" => "application/pdf",
        "epub" | "kepub" => "application/epub+zip",
        "fb2" => "application/fb2+zip",
        "mobi" | "azw" | "azw3" => "application/x-mobipocket-ebook",
        "cbr" => "application/x-cbr",
        "cbz" => "application/x-cbz",
        "cbt" => "application/x-tar",
        "cb7" => "application/x-7z-compressed",
        "djv" | "djvu" => "image/vnd.djvu",
        "mpeg" => "application/mpeg",
        "mp3" => "audio/mpeg",
        "m4a" | "m4b" => "audio/x-m4a",
        "aac" => "audio/x-hx-aac-adts",
        "ac3" => "audio/vnd.dolby.dd-raw",
        "xhtml" => "application/xhtml+xml",
        "txt" => "text/plain",
        "rtf" => "application/rtf",
        "zip" => "application/zip",
        "html" | "htm" => "text/html",
        "docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "doc" => "application/msword",
        "odt" => "application/vnd.oasis.opendocument.text",
        "mp4" => "video/mp4",
        "ogg" | "oga" => "audio/ogg",
        "wav" => "audio/x-wav",
        "flac" => "audio/flac",
        "opus" => "audio/ogg",
        "prc" => "application/octet-stream",
        _ => "application/octet-stream",
    }
}

#[cfg(test)]
mod tests {
    use super::for_format;

    // Values read from the live app's `mimetypes.types_map`.
    #[test]
    fn matches_python_table() {
        assert_eq!(for_format("pdf"), "application/pdf");
        assert_eq!(for_format("epub"), "application/epub+zip");
        assert_eq!(for_format("txt"), "text/plain");
        assert_eq!(
            for_format("docx"),
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        );
        assert_eq!(for_format("mobi"), "application/x-mobipocket-ebook");
        assert_eq!(for_format("nonsense"), "application/octet-stream");
    }
}
