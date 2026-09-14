use crate::models::AuthUser;
use sha2::{Digest, Sha256};
use std::time::{Duration, SystemTime};
use tauri::AppHandle;
use tauri_plugin_opener::OpenerExt;
use url::Url;

pub async fn login_with_google(app: &AppHandle, client_id: &str) -> Result<AuthUser, String> {
    let verifier = random_token(32)?;
    let challenge = pkce_challenge(&verifier);
    let listener = std::net::TcpListener::bind("127.0.0.1:0")
        .map_err(|e| format!("Could not start Google login callback: {e}"))?;
    let port = listener
        .local_addr()
        .map_err(|e| format!("Google login listener failed: {e}"))?
        .port();
    let redirect = format!("http://127.0.0.1:{port}/google/callback");

    let mut auth = Url::parse("https://accounts.google.com/o/oauth2/v2/auth")
        .map_err(|e| format!("Invalid Google auth URL: {e}"))?;
    auth.query_pairs_mut()
        .append_pair("client_id", client_id)
        .append_pair("redirect_uri", &redirect)
        .append_pair("response_type", "code")
        .append_pair("scope", "openid email profile")
        .append_pair("code_challenge", &challenge)
        .append_pair("code_challenge_method", "S256")
        .append_pair("access_type", "online")
        .append_pair("prompt", "select_account");

    app.opener()
        .open_url(auth.as_str(), None::<&str>)
        .map_err(|e| format!("Could not open Google sign-in: {e}"))?;

    let pairs = tokio::task::spawn_blocking(move || wait_for_callback(listener, port))
        .await
        .map_err(|e| format!("Google login task failed: {e}"))??;

    let code = pairs
        .iter()
        .find(|(k, _)| k == "code")
        .map(|(_, v)| v.clone())
        .ok_or_else(|| "Google sign-in was cancelled.".to_string())?;

    exchange_code(client_id, &redirect, &code, &verifier).await
}

fn wait_for_callback(
    listener: std::net::TcpListener,
    port: u16,
) -> Result<Vec<(String, String)>, String> {
    let server = tiny_http::Server::from_listener(listener, None)
        .map_err(|e| format!("Google login server failed: {e}"))?;
    let deadline = SystemTime::now() + Duration::from_secs(180);

    loop {
        if SystemTime::now() > deadline {
            return Err("Google sign-in timed out. Try again.".into());
        }
        match server.recv_timeout(Duration::from_millis(400)) {
            Ok(Some(request)) => {
                let url = format!("http://127.0.0.1:{port}{}", request.url());
                let parsed = Url::parse(&url).map_err(|e| format!("Bad Google callback: {e}"))?;
                let pairs: Vec<(String, String)> = parsed
                    .query_pairs()
                    .map(|(k, v)| (k.to_string(), v.to_string()))
                    .collect();
                let html = "<!doctype html><html><body style=\"font-family:Segoe UI,sans-serif;background:#0a0912;color:#fff;display:grid;place-items:center;height:100vh\"><div><h1>Google connected</h1><p>You can close this tab and return to VAULT.</p></div></body></html>";
                let response = tiny_http::Response::from_string(html).with_header(
                    tiny_http::Header::from_bytes(
                        &b"Content-Type"[..],
                        &b"text/html; charset=utf-8"[..],
                    )
                    .unwrap(),
                );
                let _ = request.respond(response);
                if parsed.path().contains("google/callback") {
                    return Ok(pairs);
                }
            }
            Ok(None) => {}
            Err(e) => return Err(format!("Google login failed: {e}")),
        }
    }
}

async fn exchange_code(
    client_id: &str,
    redirect: &str,
    code: &str,
    verifier: &str,
) -> Result<AuthUser, String> {
    let client = reqwest::Client::new();
    let json: serde_json::Value = client
        .post("https://oauth2.googleapis.com/token")
        .form(&[
            ("client_id", client_id),
            ("code", code),
            ("code_verifier", verifier),
            ("grant_type", "authorization_code"),
            ("redirect_uri", redirect),
        ])
        .send()
        .await
        .map_err(|e| format!("Google token exchange failed: {e}"))?
        .json()
        .await
        .map_err(|e| format!("Google token response was invalid: {e}"))?;

    let access = json
        .get("access_token")
        .and_then(|v| v.as_str())
        .ok_or_else(|| {
            json.get("error_description")
                .or_else(|| json.get("error"))
                .and_then(|v| v.as_str())
                .unwrap_or("Google did not return an access token.")
                .to_string()
        })?;

    let profile: serde_json::Value = client
        .get("https://www.googleapis.com/oauth2/v3/userinfo")
        .bearer_auth(access)
        .send()
        .await
        .map_err(|e| format!("Could not read Google profile: {e}"))?
        .json()
        .await
        .map_err(|e| format!("Google profile was invalid: {e}"))?;

    let display_name = profile
        .get("name")
        .and_then(|v| v.as_str())
        .or_else(|| profile.get("email").and_then(|v| v.as_str()))
        .unwrap_or("Google user")
        .to_string();

    Ok(AuthUser {
        provider: "google".into(),
        display_name: display_name.clone(),
        email: profile
            .get("email")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()),
        avatar_url: profile
            .get("picture")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()),
        initials: initials_for(&display_name),
    })
}

pub fn initials_for(name: &str) -> String {
    let parts: Vec<_> = name.split_whitespace().filter(|p| !p.is_empty()).collect();
    match parts.as_slice() {
        [] => "U".into(),
        [one] => one.chars().take(2).collect::<String>().to_uppercase(),
        [first, rest @ ..] => format!(
            "{}{}",
            first.chars().next().unwrap_or('U'),
            rest.last().and_then(|s| s.chars().next()).unwrap_or(' ')
        )
        .to_uppercase(),
    }
}

fn pkce_challenge(verifier: &str) -> String {
    let hash = Sha256::digest(verifier.as_bytes());
    base64::Engine::encode(&base64::engine::general_purpose::URL_SAFE_NO_PAD, hash)
}

fn random_token(len: usize) -> Result<String, String> {
    let mut bytes = vec![0u8; len];
    getrandom::getrandom(&mut bytes).map_err(|e| format!("Could not generate login secret: {e}"))?;
    Ok(base64::Engine::encode(
        &base64::engine::general_purpose::URL_SAFE_NO_PAD,
        bytes,
    ))
}
