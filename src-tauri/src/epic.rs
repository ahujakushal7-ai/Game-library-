use crate::models::{EpicConnection, Game};
use serde_json::Value;
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::webview::PageLoadEvent;
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_opener::OpenerExt;
use tokio::sync::oneshot;
use url::Url;

const EPIC_CLIENT_ID: &str = "34a02cf8f4414e29b15921876da36f9a";
const EPIC_CLIENT_SECRET: &str = "daafbccc737745039dffe53d94fc76cf";
const EPIC_OAUTH_HOST: &str = "account-public-service-prod03.ol.epicgames.com";
const EPIC_LIBRARY_HOST: &str = "library-service.live.use1a.on.epicgames.com";
const EPIC_CATALOG_HOST: &str = "catalog-public-service-prod06.ol.epicgames.com";
const EPIC_UA: &str =
    "UELauncher/16.0.0-36916161+++Portal+Release-Live Windows/10.0.19045.1.256.64bit";
const LOGIN_WINDOW: &str = "epic-login";
const INJECT_REDIRECT: &str = r#"
(() => {
  try {
    const text = (document.body && document.body.innerText) ? document.body.innerText.trim() : "";
    if (!text.startsWith("{")) return "";
    const data = JSON.parse(text);
    return data.authorizationCode || data.code || "";
  } catch (e) {
    return "";
  }
})()
"#;

pub fn login_url() -> String {
    let redirect = format!(
        "https://www.epicgames.com/id/api/redirect?clientId={EPIC_CLIENT_ID}&responseType=code"
    );
    format!(
        "https://www.epicgames.com/id/login?redirectUrl={}",
        urlencoding::encode(&redirect)
    )
}

pub fn open_login(app: &AppHandle) -> Result<String, String> {
    let url = login_url();
    app.opener()
        .open_url(&url, None::<&str>)
        .map_err(|e| format!("Could not open Epic sign-in: {e}"))?;
    Ok(url)
}

pub async fn capture_authorization_code(app: &AppHandle) -> Result<String, String> {
    if let Some(existing) = app.get_webview_window(LOGIN_WINDOW) {
        let _ = existing.close();
    }

    let (tx, rx) = oneshot::channel::<Result<String, String>>();
    let sender = Arc::new(Mutex::new(Some(tx)));
    let nav_sender = sender.clone();
    let load_sender = sender.clone();
    let close_sender = sender.clone();

    let parsed = login_url()
        .parse::<Url>()
        .map_err(|e| format!("Invalid Epic login URL: {e}"))?;

    WebviewWindowBuilder::new(app, LOGIN_WINDOW, WebviewUrl::External(parsed))
        .title("Sign in with Epic Games")
        .inner_size(980.0, 780.0)
        .center()
        .user_agent(
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15",
        )
        .on_navigation(move |url| {
            if let Some(code) = code_from_url(url) {
                take_send(&nav_sender, Ok(code));
                return false;
            }
            true
        })
        .on_page_load(move |window, payload| {
            if payload.event() != PageLoadEvent::Finished {
                return;
            }
            if let Some(code) = code_from_url(payload.url()) {
                take_send(&load_sender, Ok(code));
                return;
            }
            if !payload.url().as_str().contains("/id/api/redirect") {
                return;
            }
            let page_sender = load_sender.clone();
            let _ = window.eval_with_callback(INJECT_REDIRECT, move |raw| {
                if let Some(code) = js_string_result(&raw) {
                    take_send(&page_sender, Ok(code));
                }
            });
        })
        .build()
        .map_err(|e| format!("Could not open Epic sign-in window: {e}"))?;

    if let Some(window) = app.get_webview_window(LOGIN_WINDOW) {
        let _ = window.on_window_event(move |event| {
            if matches!(event, tauri::WindowEvent::Destroyed) {
                take_send(&close_sender, Err("Epic sign-in was cancelled.".into()));
            }
        });
    }

    let result = tokio::time::timeout(Duration::from_secs(180), rx)
        .await
        .map_err(|_| "Epic sign-in timed out. Try again.".to_string())?
        .map_err(|_| "Epic sign-in was cancelled.".to_string())?;

    if let Some(window) = app.get_webview_window(LOGIN_WINDOW) {
        let _ = window.close();
    }
    result
}

pub async fn exchange_auth_code(code: &str) -> Result<EpicConnection, String> {
    let mut connection = token_request(&[
        ("grant_type", "authorization_code"),
        ("code", code.trim()),
        ("token_type", "eg1"),
    ])
    .await?;
    attach_device_auth(&mut connection).await;
    Ok(connection)
}

pub async fn refresh_session(refresh_token: &str) -> Result<EpicConnection, String> {
    token_request(&[
        ("grant_type", "refresh_token"),
        ("refresh_token", refresh_token),
        ("token_type", "eg1"),
    ])
    .await
}

pub async fn ensure_session(connection: &EpicConnection) -> Result<EpicConnection, String> {
    if let (Some(device_id), Some(secret)) = (
        connection.device_id.as_deref().filter(|s| !s.is_empty()),
        connection.device_secret.as_deref().filter(|s| !s.is_empty()),
    ) {
        if !connection.account_id.is_empty() {
            match token_request(&[
                ("grant_type", "device_auth"),
                ("account_id", &connection.account_id),
                ("device_id", device_id),
                ("secret", secret),
                ("token_type", "eg1"),
            ])
            .await
            {
                Ok(mut fresh) => {
                    fresh.device_id = connection.device_id.clone();
                    fresh.device_secret = connection.device_secret.clone();
                    return Ok(fresh);
                }
                Err(_) => {}
            }
        }
    }

    if !connection.refresh_token.is_empty() {
        let mut fresh = refresh_session(&connection.refresh_token).await?;
        fresh.device_id = connection.device_id.clone();
        fresh.device_secret = connection.device_secret.clone();
        if fresh.device_id.is_none() {
            attach_device_auth(&mut fresh).await;
        }
        return Ok(fresh);
    }

    if connection.access_token.is_empty() {
        return Err("Epic session expired. Sign in with Epic again.".into());
    }
    Ok(connection.clone())
}

async fn attach_device_auth(connection: &mut EpicConnection) {
    if connection.account_id.is_empty() || connection.access_token.is_empty() {
        return;
    }
    if let Ok((device_id, secret)) =
        create_device_auth(&connection.access_token, &connection.account_id).await
    {
        connection.device_id = Some(device_id);
        connection.device_secret = Some(secret);
    }
}

async fn create_device_auth(access_token: &str, account_id: &str) -> Result<(String, String), String> {
    let json: Value = http_client()
        .post(format!(
            "https://{EPIC_OAUTH_HOST}/account/api/public/account/{account_id}/deviceAuth"
        ))
        .bearer_auth(access_token)
        .header("User-Agent", EPIC_UA)
        .json(&serde_json::json!({}))
        .send()
        .await
        .map_err(|e| format!("Epic device login failed: {e}"))?
        .json()
        .await
        .map_err(|e| format!("Epic device login response was invalid: {e}"))?;

    let device_id = json
        .get("deviceId")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "Epic did not return a device id.".to_string())?;
    let secret = json
        .get("secret")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "Epic did not return a device secret.".to_string())?;
    Ok((device_id.to_string(), secret.to_string()))
}

async fn token_request(form: &[(&str, &str)]) -> Result<EpicConnection, String> {
    let response = http_client()
        .post(format!("https://{EPIC_OAUTH_HOST}/account/api/oauth/token"))
        .basic_auth(EPIC_CLIENT_ID, Some(EPIC_CLIENT_SECRET))
        .header("User-Agent", EPIC_UA)
        .form(form)
        .send()
        .await
        .map_err(|e| format!("Epic login failed: {e}"))?;

    let status = response.status();
    let json: Value = response
        .json()
        .await
        .map_err(|e| format!("Epic login response was invalid: {e}"))?;
    if !status.is_success() || json.get("errorCode").is_some() {
        let message = json
            .get("errorMessage")
            .or_else(|| json.get("errorCode"))
            .and_then(|v| v.as_str())
            .unwrap_or("Epic rejected this authorization code.");
        return Err(message.into());
    }

    Ok(EpicConnection {
        display_name: json
            .get("displayName")
            .and_then(|v| v.as_str())
            .unwrap_or("Epic account")
            .to_string(),
        account_id: json
            .get("account_id")
            .and_then(|v| v.as_str())
            .unwrap_or_default()
            .to_string(),
        access_token: json
            .get("access_token")
            .and_then(|v| v.as_str())
            .unwrap_or_default()
            .to_string(),
        refresh_token: json
            .get("refresh_token")
            .and_then(|v| v.as_str())
            .unwrap_or_default()
            .to_string(),
        device_id: None,
        device_secret: None,
    })
}

pub async fn import_library(access_token: &str) -> Result<Vec<Game>, String> {
    let client = http_client();
    let mut records = Vec::new();
    let mut cursor: Option<String> = None;

    loop {
        let mut url =
            format!("https://{EPIC_LIBRARY_HOST}/library/api/public/items?includeMetadata=true");
        if let Some(next) = &cursor {
            url.push_str("&cursor=");
            url.push_str(&urlencoding::encode(next));
        }

        let json: Value = client
            .get(url)
            .bearer_auth(access_token)
            .header("User-Agent", EPIC_UA)
            .send()
            .await
            .map_err(|e| format!("Epic library request failed: {e}"))?
            .json()
            .await
            .map_err(|e| format!("Epic library response was invalid: {e}"))?;

        if json.get("errorCode").is_some() {
            let message = json
                .get("errorMessage")
                .and_then(|v| v.as_str())
                .unwrap_or("Epic library request was rejected.");
            return Err(message.into());
        }

        records.extend(
            json.get("records")
                .and_then(|v| v.as_array())
                .cloned()
                .unwrap_or_default(),
        );

        cursor = json
            .pointer("/responseMetadata/nextCursor")
            .and_then(|v| v.as_str())
            .filter(|s| !s.is_empty())
            .map(|s| s.to_string());
        if cursor.is_none() {
            break;
        }
    }

    let catalog = fetch_catalog(&client, access_token, &records).await;
    let mut games: Vec<Game> = records
        .iter()
        .filter_map(|record| map_record(record, &catalog))
        .collect();

    games.extend(import_local_installs());

    if games.is_empty() {
        return Err("No Epic games were found for this account.".into());
    }

    Ok(dedupe(games))
}

async fn fetch_catalog(
    client: &reqwest::Client,
    token: &str,
    records: &[Value],
) -> HashMap<String, Value> {
    let mut by_namespace: HashMap<String, Vec<String>> = HashMap::new();
    for record in records {
        let namespace = record
            .get("namespace")
            .and_then(|v| v.as_str())
            .unwrap_or_default();
        let catalog_item_id = record
            .get("catalogItemId")
            .and_then(|v| v.as_str())
            .unwrap_or_default();
        if namespace.is_empty() || catalog_item_id.is_empty() || namespace == "ue" {
            continue;
        }
        by_namespace
            .entry(namespace.to_string())
            .or_default()
            .push(catalog_item_id.to_string());
    }

    let mut catalog = HashMap::new();
    for (namespace, mut ids) in by_namespace {
        ids.sort();
        ids.dedup();
        for chunk in ids.chunks(25) {
            let mut url = format!(
                "https://{EPIC_CATALOG_HOST}/catalog/api/shared/namespace/{namespace}/bulk/items?includeDLCDetails=true&includeMainGameDetails=true&country=US&locale=en"
            );
            for id in chunk {
                url.push_str("&id=");
                url.push_str(&urlencoding::encode(id));
            }
            let Ok(response) = client
                .get(url)
                .bearer_auth(token)
                .header("User-Agent", EPIC_UA)
                .send()
                .await
            else {
                continue;
            };
            let Ok(json) = response.json::<Value>().await else {
                continue;
            };
            if let Some(map) = json.as_object() {
                for (id, item) in map {
                    catalog.insert(catalog_key(&namespace, id), item.clone());
                }
            }
        }
    }
    catalog
}

fn map_record(record: &Value, catalog: &HashMap<String, Value>) -> Option<Game> {
    let namespace = record.get("namespace")?.as_str()?.to_string();
    if namespace == "ue" {
        return None;
    }
    let catalog_item_id = record
        .get("catalogItemId")
        .and_then(|v| v.as_str())
        .unwrap_or_default()
        .to_string();
    let app_name = record
        .get("appName")
        .or_else(|| record.get("appId"))
        .and_then(|v| v.as_str())
        .unwrap_or(catalog_item_id.as_str())
        .to_string();
    if app_name.is_empty() {
        return None;
    }
    if app_name.starts_with("UE_") {
        return None;
    }

    let item = catalog.get(&catalog_key(&namespace, &catalog_item_id));
    if item.is_some_and(is_engine_or_plugin) {
        return None;
    }

    let title = item
        .and_then(|value| value.get("title").and_then(|v| v.as_str()))
        .or_else(|| record.pointer("/metadata/title").and_then(|v| v.as_str()))
        .map(str::to_string)
        .filter(|title| !title.is_empty())
        .unwrap_or_else(|| humanize_app_name(&app_name));

    let cover_url = item
        .and_then(catalog_cover)
        .unwrap_or_default();

    let launch_uri = if catalog_item_id.is_empty() {
        format!("com.epicgames.launcher://apps/{app_name}?action=launch&silent=true")
    } else {
        format!(
            "com.epicgames.launcher://apps/{namespace}%3A{catalog_item_id}%3A{app_name}?action=launch&silent=true"
        )
    };

    Some(Game {
        id: format!("epic-{app_name}"),
        title,
        platform: "epic".into(),
        cover_url,
        last_played: None,
        steam_app_id: None,
        epic_app_name: Some(app_name),
        launch_uri: Some(launch_uri),
        installed: false,
    })
}

fn catalog_cover(item: &Value) -> Option<String> {
    let images = item.get("keyImages")?.as_array()?;
    images
        .iter()
        .find(|img| {
            img.get("type")
                .and_then(|v| v.as_str())
                .is_some_and(|t| t.contains("Tall") || t.contains("Portrait") || t.contains("DieselGameBox"))
        })
        .or_else(|| images.first())
        .and_then(|img| img.get("url").and_then(|v| v.as_str()))
        .map(|s| s.to_string())
}

fn is_engine_or_plugin(item: &Value) -> bool {
    item.get("categories")
        .and_then(|v| v.as_array())
        .into_iter()
        .flatten()
        .filter_map(|category| category.get("path").and_then(|v| v.as_str()))
        .any(|path| path.contains("engines") || path.contains("plugins") || path.contains("mods/ue"))
}

pub fn import_local_installs() -> Vec<Game> {
    let mut games = Vec::new();
    for dir in epic_manifest_dirs() {
        let Ok(entries) = fs::read_dir(dir) else {
            continue;
        };
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()) != Some("item") {
                continue;
            }
            let Ok(raw) = fs::read_to_string(&path) else {
                continue;
            };
            let Ok(json) = serde_json::from_str::<Value>(&raw) else {
                continue;
            };
            let app_name = json
                .get("AppName")
                .and_then(|v| v.as_str())
                .unwrap_or_default()
                .to_string();
            let title = json
                .get("DisplayName")
                .and_then(|v| v.as_str())
                .unwrap_or(app_name.as_str())
                .to_string();
            if app_name.is_empty()
                || json.get("bIsIncompleteInstall").and_then(|v| v.as_bool()) == Some(true)
            {
                continue;
            }
            games.push(Game {
                id: format!("epic-{app_name}"),
                title,
                platform: "epic".into(),
                cover_url: String::new(),
                last_played: None,
                steam_app_id: None,
                epic_app_name: Some(app_name.clone()),
                launch_uri: Some(format!(
                    "com.epicgames.launcher://apps/{app_name}?action=launch&silent=true"
                )),
                installed: true,
            });
        }
    }
    games
}

fn epic_manifest_dirs() -> Vec<PathBuf> {
    let mut dirs = vec![PathBuf::from(
        r"C:\ProgramData\Epic\EpicGamesLauncher\Data\Manifests",
    )];
    if let Ok(home) = std::env::var("HOME") {
        dirs.push(
            PathBuf::from(home)
                .join("Library/Application Support/Epic/EpicGamesLauncher/Data/Manifests"),
        );
    }
    if let Ok(local) = std::env::var("LOCALAPPDATA") {
        dirs.push(PathBuf::from(local).join(r"EpicGamesLauncher\Saved\Library"));
    }
    dirs
}

fn dedupe(mut games: Vec<Game>) -> Vec<Game> {
    games.sort_by(|a, b| a.id.cmp(&b.id));
    games.dedup_by(|a, b| a.id == b.id);
    games
}

fn http_client() -> reqwest::Client {
    reqwest::Client::builder()
        .user_agent(EPIC_UA)
        .build()
        .unwrap_or_else(|_| reqwest::Client::new())
}

fn catalog_key(namespace: &str, catalog_item_id: &str) -> String {
    format!("{namespace}:{catalog_item_id}")
}

fn humanize_app_name(app_name: &str) -> String {
    app_name
        .replace(['_', '-'], " ")
        .split_whitespace()
        .map(|part| {
            let mut chars = part.chars();
            match chars.next() {
                Some(first) => format!("{}{}", first.to_uppercase(), chars.as_str()),
                None => String::new(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

fn code_from_url(url: &Url) -> Option<String> {
    url.query_pairs().find_map(|(key, value)| {
        let usable = match key.as_ref() {
            "vaultEpicCode" | "authorizationCode" => value.len() > 8,
            "code" => url.path().contains("/id/api/redirect") && value.len() > 8,
            _ => false,
        };
        usable.then(|| value.into_owned())
    })
}

fn js_string_result(raw: &str) -> Option<String> {
    let parsed: Value = serde_json::from_str(raw).ok()?;
    let text = parsed.as_str()?.trim();
    (text.len() > 8).then(|| text.to_string())
}

fn take_send(sender: &Arc<Mutex<Option<oneshot::Sender<Result<String, String>>>>>, value: Result<String, String>) {
    if let Ok(mut slot) = sender.lock() {
        if let Some(tx) = slot.take() {
            let _ = tx.send(value);
        }
    }
}
