//! The Rust port of `host/`.
//!
//! Replace each `unimplemented!` with the port of the source function. Return `Err` where
//! the source throws or raises: the caller gets an error there too. After changing a
//! signature, run `rust-anything refresh` to regenerate the bindings. `rust-anything diff` checks
//! behavior against what the source recorded.

#![forbid(unsafe_code)]

/// Port of `log` (`host/rebuild-listener.py:26`).
pub fn log(msg: String) -> Result<(), String> {
    use chrono::Utc;
    use std::io::Write;

    let line = log_line(&msg, Utc::now());
    print!("{line}");
    let _ = std::io::stdout().flush();
    let path = std::env::var("REBUILD_LOG_FILE")
        .unwrap_or_else(|_| "/var/log/pustaka-rebuild.log".to_owned());
    append_log_line(std::path::Path::new(&path), line.as_bytes());
    Ok(())
}

fn log_line(msg: &str, now: chrono::DateTime<chrono::Utc>) -> String {
    let base = now.format("%Y-%m-%dT%H:%M:%S");
    let micros = now.timestamp_subsec_micros();
    if micros == 0 {
        format!("[{base}+00:00] {msg}\n")
    } else {
        format!("[{base}.{micros:06}+00:00] {msg}\n")
    }
}

fn append_log_line(path: &std::path::Path, line: &[u8]) {
    use std::fs::OpenOptions;
    use std::io::Write;

    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(path) {
        let _ = file.write_all(line).and_then(|()| file.flush());
    }
}

#[cfg(test)]
mod tests {
    use super::{append_log_line, log_line};
    use chrono::Timelike;
    use chrono::{TimeZone, Utc};

    #[test]
    fn log_line_matches_python_datetime_isoformat() {
        let exact_second = Utc.with_ymd_and_hms(2026, 11, 27, 4, 5, 6).unwrap();
        assert_eq!(
            log_line("hello", exact_second),
            "[2026-11-27T04:05:06+00:00] hello\n"
        );
        let fractional = exact_second.with_nanosecond(123_456_789).unwrap();
        assert_eq!(
            log_line("hello", fractional),
            "[2026-11-27T04:05:06.123456+00:00] hello\n"
        );
    }

    #[test]
    fn appends_utf8_line_and_ignores_file_errors() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("listener.log");
        append_log_line(&path, "first\n".as_bytes());
        append_log_line(&path, "Kafé\n".as_bytes());
        assert_eq!(std::fs::read_to_string(&path).unwrap(), "first\nKafé\n");
        append_log_line(&dir.path().join("missing/parent/log"), b"ignored\n");
    }
}
