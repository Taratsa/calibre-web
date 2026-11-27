fn main() {
    // `src/reader.rs` embeds the Flask template with include_str!, so a template-only change must still rebuild the
    // binary. The file is absent in a bare checkout of `rust/` alone, which is only a rebuild question there.
    println!("cargo:rerun-if-changed=../../cps/templates/readpdf.html");
}
