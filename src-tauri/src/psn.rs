use crate::models::{Game, PsnConnection};
use reqwest::header::{HeaderMap, HeaderValue, LOCATION};
use serde_json::Value;
use tauri::AppHandle;
use tauri_plugin_opener::OpenerExt;

const PSN_CLIENT_ID: &str = "09515159-7237-4370-9b40-3806e67c0891";
const PSN_CLIENT_SECRET: &str = "ZOwhW4HZQc8ZuaVQ";
const PSN_REDIRECT: &str = "com.scee.account.oauth:/redirect";

pub fn open_login_pages(app: &AppHandle) -> Result<(), String> {
    app.opener()
        .open_url("https://www.playstation.com/en-us/", None::<&str>)
        .map_err(|e| format!("Could not open PlayStation sign-in: {e}"))?;
    Ok(())
}

pub fn npsso_url() -> &'static str {
    "https://ca.account.sony.com/api/v1/ssocookie"
}

pub async fn connect_with_npsso(npsso: &str) -> Result<(PsnConnection, Vec<Game>), String> {
    let token = npsso
        .trim()
        .trim_matches(|c| c == '"' || c == '{' || c == '}')
        .trim();
    let token = if let Ok(json) = serde_json::from_str::<Value>(npsso.trim()) {
        json.get("npsso")
            .and_then(|v| v.as_str())
            .unwrap_or(token)
            .to_string()
    } else if let Some(rest) = token.strip_prefix("npsso:") {
        rest.trim().trim_matches('"').to_string()
    } else {
        token.to_string()
    };

    if token.len() < 20 {
        return Err("That NPSSO token looks too short. Paste the full value from Sony.".into());
    }

    let access_code = exchange_npsso(&token).await?;
    let mut connection = exchange_code(&access_code).await?;
    connection.npsso = token;
    let games = import_titles(&connection.access_token).await?;
    if connection.online_id.is_empty() {
        connection.online_id = "PlayStation".into();
    }
    Ok((connection, games))
}

async fn exchange_npsso(npsso: &str) -> Result<String, String> {
    let url = format!(
        "https://ca.account.sony.com/api/authz/v3/oauth/authorize?access_type=offline&client_id={}&redirect_uri={}&response_type=code&scope={}",
        urlencoding::encode(PSN_CLIENT_ID),
        urlencoding::encode(PSN_REDIRECT),
        urlencoding::encode("psn:mobile.v2.core psn:clientapp")
    );

    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .map_err(|e| e.to_string())?;

    let response = client
        .get(url)
        .header("Cookie", format!("npsso={npsso}"))
        .send()
        .await
        .map_err(|e| format!("PlayStation authorization failed: {e}"))?;

    let location = response
        .headers()
        .get(LOCATION)
        .and_then(|v| v.to_str().ok())
        .unwrap_or_default();

    extract_code(location)
        .ok_or_else(|| {
            "PlayStation did not accept that NPSSO. Sign in on playstation.com, then copy a fresh token from ca.account.sony.com/api/v1/ssocookie.".to_string()
        })
}

fn extract_code(location: &str) -> Option<String> {
    let query = location.split('?').nth(1)?;
    for pair in query.split('&') {
        let mut parts = pair.splitn(2, '=');
        let key = parts.next()?;
        let value = parts.next().unwrap_or_default();
        if key == "code" {
            return Some(urlencoding::decode(value).ok()?.into_owned());
        }
    }
    None
}

async fn exchange_code(code: &str) -> Result<PsnConnection, String> {
    let mut headers = HeaderMap::new();
    headers.insert(
        reqwest::header::CONTENT_TYPE,
        HeaderValue::from_static("application/x-www-form-urlencoded"),
    );

    let client = reqwest::Client::new();
    let response = client
        .post("https://ca.account.sony.com/api/authz/v3/oauth/token")
        .headers(headers)
        .basic_auth(PSN_CLIENT_ID, Some(PSN_CLIENT_SECRET))
        .form(&[
            ("code", code),
            ("grant_type", "authorization_code"),
            ("redirect_uri", PSN_REDIRECT),
            ("token_format", "jwt"),
        ])
        .send()
        .await
        .map_err(|e| format!("PlayStation token exchange failed: {e}"))?;

    let json: Value = response
        .json()
        .await
        .map_err(|e| format!("PlayStation token response was invalid: {e}"))?;

    let access_token = json
        .get("access_token")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "PlayStation did not return an access token.".to_string())?
        .to_string();
    let refresh_token = json
        .get("refresh_token")
        .and_then(|v| v.as_str())
        .unwrap_or_default()
        .to_string();

    let online_id = fetch_online_id(&access_token)
        .await
        .unwrap_or_else(|_| "PlayStation".into());

    Ok(PsnConnection {
        online_id,
        npsso: String::new(),
        access_token,
        refresh_token,
    })
}

async fn fetch_online_id(access_token: &str) -> Result<String, String> {
    let json: Value = reqwest::Client::new()
        .get("https://m.np.playstation.com/api/userProfile/v1/internal/users/me/profiles")
        .bearer_auth(access_token)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;
    Ok(json
        .pointer("/onlineId")
        .or_else(|| json.pointer("/profile/onlineId"))
        .and_then(|v| v.as_str())
        .unwrap_or("PlayStation")
        .to_string())
}

pub async fn import_titles(access_token: &str) -> Result<Vec<Game>, String> {
    let client = reqwest::Client::new();
    let mut offset = 0;
    let mut games = Vec::new();

    loop {
        let url = format!(
            "https://m.np.playstation.com/api/gamelist/v2/users/me/titles?limit=100&offset={offset}&categories=ps4_game,ps5_native_game,pspc_game"
        );
        let json: Value = client
            .get(url)
            .bearer_auth(access_token)
            .send()
            .await
            .map_err(|e| format!("PlayStation library request failed: {e}"))?
            .json()
            .await
            .map_err(|e| format!("PlayStation library response was invalid: {e}"))?;

        let titles = json
            .get("titles")
            .and_then(|v| v.as_array())
            .cloned()
            .unwrap_or_default();
        if titles.is_empty() {
            break;
        }

        for title in &titles {
            let name = title
                .get("name")
                .and_then(|v| v.as_str())
                .unwrap_or("PlayStation game")
                .to_string();
            let title_id = title
                .get("titleId")
                .and_then(|v| v.as_str())
                .unwrap_or(&name)
                .to_string();
            let cover_url = title
                .get("imageUrl")
                .or_else(|| title.pointer("/concept/image"))
                .and_then(|v| v.as_str())
                .unwrap_or_default()
                .to_string();
            let last_played = title
                .get("lastPlayedDateTime")
                .or_else(|| title.get("lastPlayedDate"))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());

            games.push(Game {
                id: format!("ps5-{title_id}"),
                title: name,
                platform: "ps5".into(),
                cover_url,
                last_played,
                steam_app_id: None,
                epic_app_name: None,
                launch_uri: None,
            });
        }

        offset += titles.len();
        let total = json.get("totalItemCount").and_then(|v| v.as_u64()).unwrap_or(0);
        if offset as u64 >= total || titles.len() < 100 {
            break;
        }
    }

    if games.is_empty() {
        return Err("No PlayStation games were returned for this account.".into());
    }
    Ok(games)
}
