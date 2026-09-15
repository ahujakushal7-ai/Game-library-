use crate::models::Game;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::AppHandle;
use tauri_plugin_opener::OpenerExt;
use url::Url;

#[derive(Default)]
pub struct SteamProfile {
    pub persona_name: String,
    pub avatar_url: Option<String>,
}

pub async fn login_with_openid(app: &AppHandle) -> Result<(String, SteamProfile), String> {
    let listener = std::net::TcpListener::bind("127.0.0.1:0")
        .map_err(|e| format!("Could not start Steam login callback: {e}"))?;
    let port = listener
        .local_addr()
        .map_err(|e| format!("Steam login listener failed: {e}"))?
        .port();
    let realm = format!("http://127.0.0.1:{port}/");
    let return_to = format!("http://127.0.0.1:{port}/steam/callback");

    let mut auth = Url::parse("https://steamcommunity.com/openid/login")
        .map_err(|e| format!("Invalid Steam OpenID URL: {e}"))?;
    auth.query_pairs_mut()
        .append_pair("openid.ns", "http://specs.openid.net/auth/2.0")
        .append_pair("openid.mode", "checkid_setup")
        .append_pair("openid.return_to", &return_to)
        .append_pair("openid.realm", &realm)
        .append_pair(
            "openid.identity",
            "http://specs.openid.net/auth/2.0/identifier_select",
        )
        .append_pair(
            "openid.claimed_id",
            "http://specs.openid.net/auth/2.0/identifier_select",
        );

    app.opener()
        .open_url(auth.as_str(), None::<&str>)
        .map_err(|e| format!("Could not open Steam sign-in: {e}"))?;

    let callback = tokio::task::spawn_blocking(move || wait_for_callback(listener, port))
        .await
        .map_err(|e| format!("Steam login task failed: {e}"))??;

    let steam_id = verify_openid(&callback).await?;
    let profile = fetch_profile(&steam_id).await.unwrap_or_default();
    Ok((steam_id, profile))
}

fn wait_for_callback(
    listener: std::net::TcpListener,
    port: u16,
) -> Result<Vec<(String, String)>, String> {
    let server = tiny_http::Server::from_listener(listener, None)
        .map_err(|e| format!("Steam login server failed: {e}"))?;
    let deadline = SystemTime::now() + Duration::from_secs(180);

    loop {
        if SystemTime::now() > deadline {
            return Err("Steam sign-in timed out. Try again.".into());
        }

        match server.recv_timeout(Duration::from_millis(400)) {
            Ok(Some(request)) => {
                let url = format!("http://127.0.0.1:{port}{}", request.url());
                let parsed = Url::parse(&url).map_err(|e| format!("Bad Steam callback: {e}"))?;
                let pairs: Vec<(String, String)> = parsed
                    .query_pairs()
                    .map(|(k, v)| (k.to_string(), v.to_string()))
                    .collect();

                let html = "<!doctype html><html><body style=\"font-family:Segoe UI,sans-serif;background:#0D1117;color:#fff;display:grid;place-items:center;height:100vh\"><div><h1>Steam connected</h1><p>You can close this tab and return to Game Library.</p></div></body></html>";
                let response = tiny_http::Response::from_string(html)
                    .with_header(
                        tiny_http::Header::from_bytes(&b"Content-Type"[..], &b"text/html; charset=utf-8"[..])
                            .unwrap(),
                    );
                let _ = request.respond(response);
                if parsed.path().contains("steam/callback") {
                    return Ok(pairs);
                }
            }
            Ok(None) => {}
            Err(e) => return Err(format!("Steam login failed: {e}")),
        }
    }
}

async fn verify_openid(pairs: &[(String, String)]) -> Result<String, String> {
    let claimed = pairs
        .iter()
        .find(|(k, _)| k == "openid.claimed_id")
        .map(|(_, v)| v.clone())
        .ok_or_else(|| "Steam did not return an account id.".to_string())?;

    let mut form: Vec<(String, String)> = pairs
        .iter()
        .map(|(k, v)| {
            if k == "openid.mode" {
                (k.clone(), "check_authentication".into())
            } else {
                (k.clone(), v.clone())
            }
        })
        .collect();
    if !form.iter().any(|(k, _)| k == "openid.mode") {
        form.push(("openid.mode".into(), "check_authentication".into()));
    }

    let client = reqwest::Client::new();
    let body = client
        .post("https://steamcommunity.com/openid/login")
        .form(&form)
        .send()
        .await
        .map_err(|e| format!("Could not verify Steam login: {e}"))?
        .text()
        .await
        .map_err(|e| format!("Could not read Steam verification: {e}"))?;

    if !body.contains("is_valid:true") {
        return Err("Steam could not verify this sign-in.".into());
    }

    extract_steam_id(&claimed)
}

fn extract_steam_id(claimed_id: &str) -> Result<String, String> {
    let id = claimed_id
        .rsplit('/')
        .next()
        .unwrap_or_default()
        .trim()
        .to_string();
    if id.chars().all(|c| c.is_ascii_digit()) && !id.is_empty() {
        Ok(id)
    } else {
        Err("Steam account id was missing from the sign-in response.".into())
    }
}

async fn fetch_persona_name(steam_id: &str) -> Result<String, String> {
    let url = format!("https://steamcommunity.com/profiles/{steam_id}/?xml=1");
    let xml = reqwest::get(url)
        .await
        .map_err(|e| e.to_string())?
        .text()
        .await
        .map_err(|e| e.to_string())?;
    Ok(extract_xml_tag(&xml, "steamID").unwrap_or_default())
}

fn extract_xml_tag(xml: &str, tag: &str) -> Option<String> {
    let open = format!("<{tag}><![CDATA[");
    if let Some(start) = xml.find(&open) {
        let rest = &xml[start + open.len()..];
        return rest.split("]]>").next().map(|s| s.trim().to_string());
    }
    let open = format!("<{tag}>");
    let close = format!("</{tag}>");
    let start = xml.find(&open)? + open.len();
    let end = xml[start..].find(&close)? + start;
    Some(xml[start..end].trim().to_string())
}

pub async fn import_owned_games(steam_id: &str, api_key: &str) -> Result<Vec<Game>, String> {
    let url = format!(
        "https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key={}&steamid={}&include_appinfo=1&include_played_free_games=1&format=json",
        urlencoding::encode(api_key),
        urlencoding::encode(steam_id)
    );
    let json: serde_json::Value = reqwest::get(url)
        .await
        .map_err(|e| format!("Steam library request failed: {e}"))?
        .json()
        .await
        .map_err(|e| format!("Steam library response was invalid: {e}"))?;

    let games = json
        .pointer("/response/games")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();

    if games.is_empty() {
        return Err("Steam returned no games. Make sure the API key belongs to this account and the game details privacy setting is public.".into());
    }

    Ok(games
        .into_iter()
        .filter_map(|entry| {
            let app_id = entry.get("appid")?.as_u64()?.to_string();
            let title = entry
                .get("name")
                .and_then(|v| v.as_str())
                .unwrap_or("Unknown Steam game")
                .to_string();
            let last_played = entry
                .get("rtime_last_played")
                .and_then(|v| v.as_u64())
                .filter(|v| *v > 0)
                .and_then(unix_to_iso);
            Some(Game {
                id: format!("steam-{app_id}"),
                title,
                platform: "steam".into(),
                cover_url: steam_cover(&app_id),
                last_played,
                steam_app_id: Some(app_id),
                epic_app_name: None,
                launch_uri: None,
            })
        })
        .collect())
}

pub fn import_local_installs() -> Vec<Game> {
    let mut games = Vec::new();
    for folder in steam_library_folders() {
        let steamapps = folder.join("steamapps");
        let Ok(entries) = fs::read_dir(&steamapps) else {
            continue;
        };
        for entry in entries.flatten() {
            let path = entry.path();
            if path
                .file_name()
                .and_then(|n| n.to_str())
                .is_some_and(|n| n.starts_with("appmanifest_") && n.ends_with(".acf"))
            {
                if let Some(game) = parse_acf(&path) {
                    games.push(game);
                }
            }
        }
    }
    games
}

fn steam_cover(app_id: &str) -> String {
    format!(
        "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/{app_id}/library_600x900.jpg"
    )
}

fn unix_to_iso(ts: u64) -> Option<String> {
    let time = UNIX_EPOCH + Duration::from_secs(ts);
    let datetime = chrono::DateTime::<chrono::Utc>::from(time);
    Some(datetime.to_rfc3339())
}

fn steam_library_folders() -> Vec<PathBuf> {
    let mut folders = Vec::new();
    if let Some(root) = steam_install_path() {
        folders.push(root.clone());
        let vdf = root.join("steamapps").join("libraryfolders.vdf");
        if let Ok(text) = fs::read_to_string(vdf) {
            for cap in text.split('"').filter(|part| Path::new(part).is_absolute()) {
                folders.push(PathBuf::from(cap.replace("\\\\", "\\")));
            }
        }
    }
    folders.sort();
    folders.dedup();
    folders
}

fn steam_install_path() -> Option<PathBuf> {
    #[cfg(target_os = "windows")]
    {
        let hkcu = winreg::RegKey::predef(winreg::enums::HKEY_CURRENT_USER);
        if let Ok(key) = hkcu.open_subkey("Software\\Valve\\Steam") {
            if let Ok(path) = key.get_value::<String, _>("SteamPath") {
                return Some(PathBuf::from(path));
            }
        }
        let hklm = winreg::RegKey::predef(winreg::enums::HKEY_LOCAL_MACHINE);
        if let Ok(key) = hklm.open_subkey("SOFTWARE\\WOW6432Node\\Valve\\Steam") {
            if let Ok(path) = key.get_value::<String, _>("InstallPath") {
                return Some(PathBuf::from(path));
            }
        }
    }
    None
}

fn parse_acf(path: &Path) -> Option<Game> {
    let text = fs::read_to_string(path).ok()?;
    let app_id = kv(&text, "appid")?;
    if app_id == "228980" {
        return None;
    }
    let title = kv(&text, "name").unwrap_or_else(|| format!("Steam {app_id}"));
    let last_played = kv(&text, "LastPlayed")
        .and_then(|v| v.parse::<u64>().ok())
        .filter(|v| *v > 0)
        .and_then(unix_to_iso);
    Some(Game {
        id: format!("steam-{app_id}"),
        title,
        platform: "steam".into(),
        cover_url: steam_cover(&app_id),
        last_played,
        steam_app_id: Some(app_id),
        epic_app_name: None,
        launch_uri: None,
    })
}

fn kv(text: &str, key: &str) -> Option<String> {
    let pattern = format!("\"{key}\"");
    let idx = text.find(&pattern)?;
    let rest = &text[idx + pattern.len()..];
    let start = rest.find('"')? + 1;
    let end = rest[start..].find('"')? + start;
    Some(rest[start..end].to_string())
}
