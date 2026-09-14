use crate::models::{Snapshot, SteamConnection};
use crate::{epic, psn, steam, storage};
use tauri::AppHandle;
use tauri_plugin_opener::OpenerExt;

#[tauri::command]
pub fn get_snapshot(app: AppHandle) -> Result<Snapshot, String> {
    Ok(storage::load(&app)?.snapshot())
}

#[tauri::command]
pub async fn steam_login(app: AppHandle) -> Result<Snapshot, String> {
    let (steam_id, persona_name) = steam::login_with_openid(&app).await?;
    let mut store = storage::load(&app)?;
    let api_key = store.steam.as_ref().and_then(|s| s.api_key.clone());
    store.steam = Some(SteamConnection {
        steam_id: steam_id.clone(),
        persona_name,
        api_key: api_key.clone(),
    });

    let mut games = steam::import_local_installs();
    if let Some(key) = api_key.as_deref().filter(|k| !k.is_empty()) {
        match steam::import_owned_games(&steam_id, key).await {
            Ok(owned) => games = owned,
            Err(err) => log::warn!("Steam Web API import failed, using local installs: {err}"),
        }
    }
    store.replace_platform_games("steam", games);
    storage::save(&app, &store)?;
    Ok(store.snapshot())
}

#[tauri::command]
pub async fn steam_save_api_key(app: AppHandle, api_key: String) -> Result<Snapshot, String> {
    let key = api_key.trim().to_string();
    if key.len() < 10 {
        return Err("Enter the Steam Web API key from steamcommunity.com/dev/apikey.".into());
    }
    let mut store = storage::load(&app)?;
    let steam_id = store
        .steam
        .as_ref()
        .map(|s| s.steam_id.clone())
        .ok_or_else(|| "Sign in with Steam before saving an API key.".to_string())?;
    let persona_name = store
        .steam
        .as_ref()
        .map(|s| s.persona_name.clone())
        .unwrap_or_default();
    store.steam = Some(SteamConnection {
        steam_id: steam_id.clone(),
        persona_name,
        api_key: Some(key.clone()),
    });
    let games = steam::import_owned_games(&steam_id, &key).await?;
    store.replace_platform_games("steam", games);
    storage::save(&app, &store)?;
    Ok(store.snapshot())
}

#[tauri::command]
pub fn steam_open_api_key_page(app: AppHandle) -> Result<(), String> {
    app.opener()
        .open_url("https://steamcommunity.com/dev/apikey", None::<&str>)
        .map_err(|e| format!("Could not open Steam API key page: {e}"))
}

#[tauri::command]
pub fn epic_begin_login(app: AppHandle) -> Result<(), String> {
    epic::open_login(&app).map(|_| ())
}

#[tauri::command]
pub async fn epic_complete_login(app: AppHandle, authorization_code: String) -> Result<Snapshot, String> {
    let code = extract_epic_code(&authorization_code)?;
    let connection = epic::exchange_auth_code(&code).await?;
    let games = epic::import_library(&connection.access_token).await?;
    let mut store = storage::load(&app)?;
    store.epic = Some(connection);
    store.replace_platform_games("epic", games);
    storage::save(&app, &store)?;
    Ok(store.snapshot())
}

#[tauri::command]
pub fn psn_begin_login(app: AppHandle) -> Result<String, String> {
    psn::open_login_pages(&app)?;
    Ok(psn::npsso_url().to_string())
}

#[tauri::command]
pub fn psn_open_npsso_page(app: AppHandle) -> Result<(), String> {
    app.opener()
        .open_url(psn::npsso_url(), None::<&str>)
        .map_err(|e| format!("Could not open NPSSO page: {e}"))
}

#[tauri::command]
pub async fn psn_complete_login(app: AppHandle, npsso: String) -> Result<Snapshot, String> {
    let (connection, games) = psn::connect_with_npsso(&npsso).await?;
    let mut store = storage::load(&app)?;
    store.psn = Some(connection);
    store.replace_platform_games("ps5", games);
    storage::save(&app, &store)?;
    Ok(store.snapshot())
}

#[tauri::command]
pub fn disconnect_account(app: AppHandle, platform: String) -> Result<Snapshot, String> {
    let mut store = storage::load(&app)?;
    match platform.as_str() {
        "steam" => {
            store.steam = None;
            store.replace_platform_games("steam", Vec::new());
        }
        "epic" => {
            store.epic = None;
            store.replace_platform_games("epic", Vec::new());
        }
        "ps5" | "psn" => {
            store.psn = None;
            store.replace_platform_games("ps5", Vec::new());
        }
        _ => return Err(format!("Unknown platform: {platform}")),
    }
    storage::save(&app, &store)?;
    Ok(store.snapshot())
}

#[tauri::command]
pub async fn refresh_connected(app: AppHandle) -> Result<Snapshot, String> {
    let mut store = storage::load(&app)?;

    if let Some(steam_conn) = store.steam.clone() {
        let mut games = steam::import_local_installs();
        if let Some(key) = steam_conn.api_key.as_deref().filter(|k| !k.is_empty()) {
            if let Ok(owned) = steam::import_owned_games(&steam_conn.steam_id, key).await {
                games = owned;
            }
        }
        store.replace_platform_games("steam", games);
    }

    if let Some(mut epic_conn) = store.epic.clone() {
        if let Ok(refreshed) = epic::refresh_session(&epic_conn.refresh_token).await {
            epic_conn = refreshed.clone();
            store.epic = Some(refreshed);
        }
        if let Ok(games) = epic::import_library(&epic_conn.access_token).await {
            store.replace_platform_games("epic", games);
        }
    }

    if let Some(psn_conn) = store.psn.clone() {
        if let Ok(games) = psn::import_titles(&psn_conn.access_token).await {
            store.replace_platform_games("ps5", games);
        }
    }

    storage::save(&app, &store)?;
    Ok(store.snapshot())
}

fn extract_epic_code(raw: &str) -> Result<String, String> {
    let trimmed = raw.trim();
    if let Ok(json) = serde_json::from_str::<serde_json::Value>(trimmed) {
        if let Some(code) = json
            .get("authorizationCode")
            .or_else(|| json.get("code"))
            .and_then(|v| v.as_str())
        {
            return Ok(code.to_string());
        }
    }
    if trimmed.len() < 8 {
        return Err("Paste the authorizationCode from the Epic JSON page after you sign in.".into());
    }
    Ok(trimmed.to_string())
}
