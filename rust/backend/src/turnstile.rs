//! Cloudflare Turnstile: the bot check in front of the password form.
//!
//! The site is public and needs no account, so the login form is the only place a bot can guess passwords; Turnstile
//! sits there (and only there). The sitekey is public (it is in the HTML), the secret is not, so both come from the
//! environment (`TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`), never from the database. With either missing the check
//! is disabled and the form renders without the widget, so a misconfigured deployment cannot lock the admin out.

use std::time::Duration;

const SITEVERIFY: &str = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
/// Cloudflare's documented maximum token length; anything longer is not a real token.
const MAX_TOKEN: usize = 2048;
const TIMEOUT: Duration = Duration::from_secs(5);

#[derive(Clone)]
pub struct Turnstile {
    site_key: String,
    secret: String,
}

impl Turnstile {
    pub fn from_env() -> Option<Self> {
        let read = |name: &str| {
            std::env::var(name)
                .ok()
                .map(|value| value.trim().to_owned())
                .filter(|value| !value.is_empty())
        };
        let site_key = read("TURNSTILE_SITE_KEY")?;
        let secret = read("TURNSTILE_SECRET_KEY")?;
        Some(Self { site_key, secret })
    }

    pub fn site_key(&self) -> &str {
        &self.site_key
    }

    /// `POST https://challenges.cloudflare.com/turnstile/v0/siteverify`, `success` in the answer.
    pub async fn verify(&self, client: &reqwest::Client, token: &str, remote_ip: &str) -> bool {
        if token.is_empty() || token.len() > MAX_TOKEN {
            return false;
        }
        let mut form = vec![("secret", self.secret.as_str()), ("response", token)];
        if !remote_ip.is_empty() {
            form.push(("remoteip", remote_ip));
        }
        let response = client
            .post(SITEVERIFY)
            .timeout(TIMEOUT)
            .form(&form)
            .send()
            .await;
        let response = match response {
            Ok(response) => response,
            Err(error) => {
                tracing::error!("Turnstile siteverify request failed: {error}");
                return false;
            }
        };
        // reqwest is built without its `json` feature here, so the body is parsed by hand.
        let body: serde_json::Value = match response.text().await {
            Ok(text) => match serde_json::from_str(&text) {
                Ok(body) => body,
                Err(error) => {
                    tracing::error!("Turnstile siteverify answer is not JSON: {error}: {text}");
                    return false;
                }
            },
            Err(error) => {
                tracing::error!("Turnstile siteverify answer could not be read: {error}");
                return false;
            }
        };
        let success = body.get("success").and_then(serde_json::Value::as_bool) == Some(true);
        if !success {
            tracing::warn!("Turnstile rejected a login: {body}");
        }
        success
    }
}

#[cfg(test)]
mod tests {
    use super::{MAX_TOKEN, Turnstile};

    #[test]
    fn a_token_that_cannot_be_real_is_refused_without_a_request() {
        // Both calls return before the network: the empty and the over-long token.
        let turnstile = Turnstile {
            site_key: "site".into(),
            secret: "secret".into(),
        };
        let client = reqwest::Client::new();
        let runtime = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .unwrap();
        assert!(!runtime.block_on(turnstile.verify(&client, "", "203.0.113.9")));
        let long = "x".repeat(MAX_TOKEN + 1);
        assert!(!runtime.block_on(turnstile.verify(&client, &long, "203.0.113.9")));
    }

    /// Without both environment variables the check is off, which is what keeps a half-configured deployment usable.
    #[test]
    fn the_keys_come_from_the_environment() {
        // The test process has no Turnstile variables set (the container sets them for the server only).
        assert!(Turnstile::from_env().is_none());
    }
}
