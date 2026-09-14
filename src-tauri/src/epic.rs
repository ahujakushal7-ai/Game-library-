use crate::models::{EpicConnection, Game};
use serde_json::Value;
use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;
use tauri_plugin_opener::OpenerExt;

const EPIC_CLIENT_ID: &str = "34a02cf8f4414e29b15921876da36f9a";
const EPIC_CLIENT_SECRET: &str = "daafbccc737745039dffe53d94fc76cf";
const EPIC_OAUTH_HOST: &str = "account-public-service-prod03.ol.epicgames.com";
const EPIC_LIBRARY_HOST: &str = "library-service.live.use1a.on.epicgames.com";
const EPIC_CATALOG_HOST: &str = "catalog-public-service-prod06.ol.epicgames.com";

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

pub async fn exchange_auth_code(code: &str) -> Result<EpicConnection, String> {
    token_request(&[
        ("grant_type", "authorization_code"),
        ("code", code.trim()),
        ("token_type", "eg1"),
    ])
    .await
}

pub async fn refresh_session(refresh_token: &str) -> Result<EpicConnection, String> {
    token_request(&[
        ("grant_type", "refresh_token"),
        ("refresh_token", refresh_token),
        ("token_type", "eg1"),
    ])
    .await
}

async fn token_request(form: &[(&str, &str)]) -> Result<EpicConnection, String> {
    let client = reqwest::Client::new();
    let response = client
        .post(format!("https://{EPIC_OAUTH_HOST}/account/api/oauth/token"))
        .basic_auth(EPIC_CLIENT_ID, Some(EPIC_CLIENT_SECRET))
        .header(
            "User-Agent",
            "UELauncher/11.0.1-14907503+++Portal+Release-Live Windows/10.0.19041.1.256.64bit",
        )
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
    })
}

pub async fn import_library(access_token: &str) -> Result<Vec<Game>, String> {
    let client = reqwest::Client::new();
    let mut games = Vec::new();
    let mut cursor: Option<String> = None;

    loop {
        let mut url = format!("https://{EPIC_LIBRARY_HOST}/library/api/public/items?includeMetadata=true");
        if let Some(next) = &cursor {
            url.push_str("&cursor=");
            url.push_str(&urlencoding::encode(next));
        }

        let json: Value = client
            .get(url)
            .bearer_auth(access_token)
            .send()
            .await
            .map_err(|e| format!("Epic library request failed: {e}"))?
            .json()
            .await
            .map_err(|e| format!("Epic library response was invalid: {e}"))?;

        let records = json
            .get("records")
            .and_then(|v| v.as_array())
            .cloned()
            .unwrap_or_default();

        for record in records {
            if let Some(game) = map_record(&client, access_token, &record).await {
                games.push(game);
            }
        }

        cursor = json
            .pointer("/responseMetadata/nextCursor")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());
        if cursor.is_none() {
            break;
        }
    }

    if games.is_empty() {
        games.extend(import_local_installs());
    }

    if games.is_empty() {
        return Err("No Epic games were found for this account.".into());
    }

    Ok(dedupe(games))
}

async fn map_record(client: &reqwest::Client, token: &str, record: &Value) -> Option<Game> {
    let namespace = record.get("namespace")?.as_str()?.to_string();
    let catalog_item_id = record
        .get("catalogItemId")
        .and_then(|v| v.as_str())
        .unwrap_or_default()
        .to_string();
    let app_name = record
        .get("appId")
        .or_else(|| record.get("appName"))
        .and_then(|v| v.as_str())
        .unwrap_or(catalog_item_id.as_str())
        .to_string();
    let title = record
        .pointer("/metadata/title")
        .and_then(|v| v.as_str())
        .unwrap_or(&app_name)
        .to_string();

    if title.is_empty() || app_name.is_empty() {
        return None;
    }

    let cover_url = catalog_cover(client, token, &namespace, &catalog_item_id)
        .await
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
    })
}

async fn catalog_cover(
    client: &reqwest::Client,
    token: &str,
    namespace: &str,
    catalog_item_id: &str,
) -> Option<String> {
    if catalog_item_id.is_empty() {
        return None;
    }
    let url = format!(
        "https://{EPIC_CATALOG_HOST}/catalog/api/shared/namespace/{namespace}/bulk/items?id={catalog_item_id}&includeDLCDetails=true&includeMainGameDetails=true"
    );
    let json: Value = client
        .get(url)
        .bearer_auth(token)
        .send()
        .await
        .ok()?
        .json()
        .await
        .ok()?;
    let images = json
        .get(catalog_item_id)?
        .get("keyImages")?
        .as_array()?;
    images
        .iter()
        .find(|img| {
            img.get("type")
                .and_then(|v| v.as_str())
                .is_some_and(|t| t.contains("Tall") || t.contains("Portrait"))
        })
        .or_else(|| images.first())
        .and_then(|img| img.get("url").and_then(|v| v.as_str()))
        .map(|s| s.to_string())
}

pub fn import_local_installs() -> Vec<Game> {
    let mut games = Vec::new();
    let dir = PathBuf::from(r"C:\ProgramData\Epic\EpicGamesLauncher\Data\Manifests");
    let Ok(entries) = fs::read_dir(dir) else {
        return games;
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
        if app_name.is_empty() || json.get("bIsIncompleteInstall").and_then(|v| v.as_bool()) == Some(true)
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
        });
    }
    games
}

fn dedupe(mut games: Vec<Game>) -> Vec<Game> {
    games.sort_by(|a, b| a.id.cmp(&b.id));
    games.dedup_by(|a, b| a.id == b.id);
    games
}
