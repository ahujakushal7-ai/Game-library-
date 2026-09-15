mod accounts;
mod epic;
mod google;
mod launch;
mod models;
mod psn;
mod steam;
mod storage;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let _ = env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info"))
        .try_init();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            launch::launch_game,
            accounts::get_snapshot,
            accounts::google_login,
            accounts::save_google_client_id,
            accounts::sign_out,
            accounts::steam_login,
            accounts::steam_save_api_key,
            accounts::steam_open_api_key_page,
            accounts::epic_begin_login,
            accounts::epic_login,
            accounts::epic_complete_login,
            accounts::psn_begin_login,
            accounts::psn_open_npsso_page,
            accounts::psn_complete_login,
            accounts::confirm_library_import,
            accounts::dismiss_library_prompt,
            accounts::disconnect_account,
            accounts::refresh_connected,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
