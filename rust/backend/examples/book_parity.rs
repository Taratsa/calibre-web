//! Replay a JSON list of `{book, field, value}` saves through `bookedit::save_field` on a library COPY and print one
//! line per save: `book field status error`. Used to compare against Flask's own `/admin/books/<id>/<field>`:
//!   cargo run --release --example book_parity -- <library dir> <app.db> <ops.json> [locale]
use std::path::Path;
use taratsa_backend::bookedit::{Env, Field, save_field, title_regex};

fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let (library, app_db, ops) = (Path::new(&args[0]), Path::new(&args[1]), &args[2]);
    let locale = args.get(3).map_or("en", String::as_str);
    let unicode = false;
    let mut conn = taratsa_backend::authors::open_library(
        &library.join("metadata.db"),
        Some(title_regex(app_db)),
    )
    .expect("open");
    let env = Env {
        library,
        unicode,
        locale,
    };
    let ops: Vec<serde_json::Value> =
        serde_json::from_str(&std::fs::read_to_string(ops).unwrap()).unwrap();
    for op in ops {
        let book = op["book"].as_i64().unwrap();
        let name = op["field"].as_str().unwrap();
        let value = op["value"].as_str().unwrap();
        let field = Field::parse(name).expect("field");
        match save_field(&mut conn, &env, book, field, value) {
            Ok(saved) => println!("{book} {name} ok changed={}", saved.changed),
            Err(error) => println!("{book} {name} ERR {}", error.message()),
        }
    }
}
