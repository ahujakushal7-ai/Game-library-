use crate::models::AppStore;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

pub fn store_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("App data folder is unavailable: {e}"))?;
    fs::create_dir_all(&dir).map_err(|e| format!("Could not create app data folder: {e}"))?;
    Ok(dir.join("library-state.json"))
}

pub fn load(app: &AppHandle) -> Result<AppStore, String> {
    let path = store_path(app)?;
    if !path.exists() {
        return Ok(AppStore::default());
    }
    let raw = fs::read_to_string(&path).map_err(|e| format!("Could not read saved library: {e}"))?;
    serde_json::from_str(&raw).map_err(|e| format!("Saved library is invalid: {e}"))
}

pub fn save(app: &AppHandle, store: &AppStore) -> Result<(), String> {
    let path = store_path(app)?;
    let raw = serde_json::to_string_pretty(store)
        .map_err(|e| format!("Could not serialize library: {e}"))?;
    fs::write(path, raw).map_err(|e| format!("Could not save library: {e}"))
}
