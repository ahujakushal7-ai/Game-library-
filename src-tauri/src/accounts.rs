use crate::models::{AuthUser, Snapshot, SteamConnection};
use crate::{epic, google, psn, steam, storage};
use tauri::AppHandle;
use tauri_plugin_opener::OpenerExt;

fn google_client_id(store: &crate::models::AppStore) -> Result<String, String> {
    if let Ok(id) = std::env::var("VAULT_GOOGLE_CLIENT_ID") {
        if !id.trim().is_empty() {
            return Ok(id.trim().to_string());
        }
    }
    store
        .google_client_id
        .as_deref()
        .map(str::trim)
        .filter(|id| !id.is_empty())
        .map(|id| id.to_string())
        .ok_or_else(|| {
            "Add a Google OAuth Desktop client ID from Google Cloud Console, then save it on the sign-in screen.".into()
        })
}

#[tauri::command]
pub fn get_snapshot(app: AppHandle) -> Result<Snapshot, String> {
    Ok(storage::load(&app)?.snapshot())
}

#[tauri::command]
pub async fn google_login(app: AppHandle, client_id: Option<String>) -> Result<Snapshot, String> {
    let mut store = storage::load(&app)?;
    if let Some(id) = client_id.as_deref().map(str::trim).filter(|s| !s.is_empty()) {
        store.google_client_id = Some(id.to_string());
        storage::save(&app, &store)?;
    }
    let id = google_client_id(&store)?;
    let user = google::login_with_google(&app, &id).await?;
    store.user = Some(user);
    storage::save(&app, &store)?;
    Ok(store.snapshot())
}

#[tauri::command]
pub fn save_google_client_id(app: AppHandle, client_id: String) -> Result<(), String> {
    let mut store = storage::load(&app)?;
    store.google_client_id = Some(client_id.trim().to_string());
    storage::save(&app, &store)
}

#[tauri::command]
pub fn sign_out(app: AppHandle) -> Result<Snapshot, String> {
    let mut store = storage::load(&app)?;
    store.user = None;
    storage::save(&app, &store)?;
    Ok(store.snapshot())
}

#[tauri::command]
pub async fn steam_login(app: AppHandle) -> Result<Snapshot, String> {
    let (steam_id, profile) = steam::login_with_openid(&app).await?;
    let mut store = storage::load(&app)?;
    let persona_name = if profile.persona_name.trim().is_empty() {
        "Steam Player".to_string()
    } else {
        profile.persona_name.trim().to_string()
    };
    let api_key = store.steam.as_ref().and_then(|s| s.api_key.clone());
    store.steam = Some(SteamConnection {
        steam_id: steam_id.clone(),
        persona_name: persona_name.clone(),
        api_key: api_key.clone(),
    });
    if store.user.is_none() || store.user.as_ref().is_some_and(|u| u.provider == "steam") {
        store.user = Some(AuthUser {
            provider: "steam".into(),
            display_name: persona_name.clone(),
            email: None,
            avatar_url: profile.avatar_url.clone(),
            initials: google::initials_for(&persona_name),
        });
    }

    let mut games = steam::import_local_installs();
    if let Some(key) = api_key.as_deref().filter(|k| !k.is_empty()) {
        if let Ok(owned) = steam::import_owned_games(&steam_id, key).await {
            games = owned;
        }
        store.replace_platform_games("steam", games);
        store.mark_imported("steam");
    } else {
        store.replace_platform_games("steam", games);
    }
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
    store.mark_imported("steam");
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
    let mut store = storage::load(&app)?;
    let first_time = !store.imported_libraries.iter().any(|item| item == "epic")
        && !store.skipped_libraries.iter().any(|item| item == "epic");
    if store.user.is_none() {
        store.user = Some(AuthUser {
            provider: "epic".into(),
            display_name: connection.display_name.clone(),
            email: None,
            avatar_url: None,
            initials: google::initials_for(&connection.display_name),
        });
    }
    store.epic = Some(connection.clone());
    if !first_time {
        let games = epic::import_library(&connection.access_token).await?;
        store.replace_platform_games("epic", games);
        store.mark_imported("epic");
    }
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
    let first_time = !store.imported_libraries.iter().any(|item| item == "psn")
        && !store.skipped_libraries.iter().any(|item| item == "psn");
    if store.user.is_none() {
        store.user = Some(AuthUser {
            provider: "psn".into(),
            display_name: connection.online_id.clone(),
            email: None,
            avatar_url: None,
            initials: google::initials_for(&connection.online_id),
        });
    }
    store.psn = Some(connection);
    if !first_time {
        store.replace_platform_games("ps5", games);
        store.mark_imported("psn");
    }
    storage::save(&app, &store)?;
    Ok(store.snapshot())
}

#[tauri::command]
pub async fn confirm_library_import(app: AppHandle, provider: String) -> Result<Snapshot, String> {
    let mut store = storage::load(&app)?;
    match provider.as_str() {
        "epic" => {
            let token = store
                .epic
                .as_ref()
                .map(|e| e.access_token.clone())
                .ok_or_else(|| "Sign in with Epic before importing that library.".to_string())?;
            let games = epic::import_library(&token).await?;
            store.replace_platform_games("epic", games);
            store.mark_imported("epic");
        }
        "psn" | "ps5" => {
            let token = store
                .psn
                .as_ref()
                .map(|p| p.access_token.clone())
                .ok_or_else(|| "Sign in with PlayStation before importing that library.".to_string())?;
            let games = psn::import_titles(&token).await?;
            store.replace_platform_games("ps5", games);
            store.mark_imported("psn");
        }
        "steam" => {
            let steam_conn = store
                .steam
                .clone()
                .ok_or_else(|| "Sign in with Steam before importing that library.".to_string())?;
            let mut games = steam::import_local_installs();
            if let Some(key) = steam_conn.api_key.as_deref().filter(|k| !k.is_empty()) {
                if let Ok(owned) = steam::import_owned_games(&steam_conn.steam_id, key).await {
                    games = owned;
                }
            }
            store.replace_platform_games("steam", games);
            store.mark_imported("steam");
        }
        other => return Err(format!("Unknown library: {other}")),
    }
    storage::save(&app, &store)?;
    Ok(store.snapshot())
}

#[tauri::command]
pub fn dismiss_library_prompt(app: AppHandle, provider: String) -> Result<Snapshot, String> {
    let mut store = storage::load(&app)?;
    store.mark_skipped(&provider);
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
            store.imported_libraries.retain(|item| item != "steam");
        }
        "epic" => {
            store.epic = None;
            store.replace_platform_games("epic", Vec::new());
            store.imported_libraries.retain(|item| item != "epic");
        }
        "ps5" | "psn" => {
            store.psn = None;
            store.replace_platform_games("ps5", Vec::new());
            store.imported_libraries.retain(|item| item != "psn");
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
        store.mark_imported("steam");
    }

    if let Some(mut epic_conn) = store.epic.clone() {
        if let Ok(refreshed) = epic::refresh_session(&epic_conn.refresh_token).await {
            epic_conn = refreshed.clone();
            store.epic = Some(refreshed);
        }
        if let Ok(games) = epic::import_library(&epic_conn.access_token).await {
            store.replace_platform_games("epic", games);
            store.mark_imported("epic");
        }
    }

    if let Some(psn_conn) = store.psn.clone() {
        if let Ok(games) = psn::import_titles(&psn_conn.access_token).await {
            store.replace_platform_games("ps5", games);
            store.mark_imported("psn");
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
