//! Run an author rename against a COPY of metadata.db and print what changed:
//!   cargo run --release --example author_dryrun -- /tmp/authcheck/metadata.db "old" "new"
use taratsa_backend::authors::{apply, open_library, plan};
fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let (path, old, new) = (&args[0], &args[1], &args[2]);
    let mut conn = open_library(std::path::Path::new(path), None).expect("open");
    let preview = plan(&conn, old, new).expect("plan");
    println!(
        "mode={:?} books={} old=({:?}, sort {:?}) target={:?}",
        preview.mode,
        preview.books.len(),
        preview.old_name,
        preview.old_sort,
        preview.target
    );
    for book in preview.books.iter().take(3) {
        println!(
            "  #{} {} | {:?} | had_target={}",
            book.id, book.title, book.author_sort, book.had_target
        );
    }
    let started = std::time::Instant::now();
    let done = apply(&mut conn, old, new, preview.books.len(), None).expect("apply");
    println!(
        "applied {:?} to {} books in {:?}",
        done.mode,
        done.books,
        started.elapsed()
    );
}
