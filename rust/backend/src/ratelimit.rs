//! In-memory rate limits for the password and second-factor forms.
//!
//! Flask's own Flask-Limiter guards `/login` per username (`3/minute`, `40/day`) and `/register` per address. Once
//! Rust answers `POST /login`, that protection has to live here too, with the same shape: a sliding window per key
//! (username for the form, user id for the second factor), pruned as it is read. The counters are process-local
//! memory, so a restart forgets them — exactly like Flask's in-memory storage.

use std::collections::{HashMap, VecDeque};
use std::sync::Mutex;
use std::time::{Duration, Instant};

/// Beyond this many distinct keys (a username-spraying run), the whole map is dropped instead of growing without
/// bound: every existing window resets, which is the safe side for memory and never for the attacker.
const MAX_KEYS: usize = 20_000;

#[derive(Default)]
pub struct RateLimiter {
    buckets: Mutex<HashMap<String, VecDeque<Instant>>>,
}

impl RateLimiter {
    pub fn new() -> Self {
        Self::default()
    }

    /// Records one attempt for `key` and answers whether it is within `limit` per `window`.
    pub fn allow(&self, key: &str, limit: usize, window: Duration) -> bool {
        let now = Instant::now();
        let mut buckets = self
            .buckets
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        if buckets.len() > MAX_KEYS {
            buckets.clear();
        }
        let window_hits = buckets.entry(key.to_owned()).or_default();
        while window_hits
            .front()
            .is_some_and(|at| now.duration_since(*at) >= window)
        {
            window_hits.pop_front();
        }
        if window_hits.len() >= limit {
            return false;
        }
        window_hits.push_back(now);
        true
    }

    /// Seconds until the oldest attempt of the window falls out, for the message shown to the person waiting.
    pub fn retry_after(&self, key: &str, window: Duration) -> u64 {
        let now = Instant::now();
        let buckets = self
            .buckets
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        buckets
            .get(key)
            .and_then(|hits| hits.front())
            .map(|at| {
                window
                    .saturating_sub(now.duration_since(*at))
                    .as_secs()
                    .max(1)
            })
            .unwrap_or(1)
    }

    /// Called after a successful login, as Flask clears its limits then.
    pub fn clear(&self, key: &str) {
        let mut buckets = self
            .buckets
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        buckets.remove(key);
    }
}

#[cfg(test)]
mod tests {
    use super::RateLimiter;
    use std::time::Duration;

    #[test]
    fn a_window_admits_the_limit_then_refuses() {
        let limiter = RateLimiter::new();
        let minute = Duration::from_secs(60);
        assert!(limiter.allow("admin", 3, minute));
        assert!(limiter.allow("admin", 3, minute));
        assert!(limiter.allow("admin", 3, minute));
        assert!(!limiter.allow("admin", 3, minute));
        // another key is unaffected, and clearing restores the first
        assert!(limiter.allow("hermes", 3, minute));
        limiter.clear("admin");
        assert!(limiter.allow("admin", 3, minute));
    }

    #[test]
    fn old_hits_fall_out_of_the_window() {
        let limiter = RateLimiter::new();
        let window = Duration::from_millis(40);
        assert!(limiter.allow("k", 1, window));
        assert!(!limiter.allow("k", 1, window));
        std::thread::sleep(Duration::from_millis(60));
        assert!(limiter.allow("k", 1, window));
        let retry = limiter.retry_after("k", Duration::from_secs(60));
        assert!((1..=60).contains(&retry), "{retry}");
    }
}
