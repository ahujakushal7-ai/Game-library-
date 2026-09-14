use serde::Deserialize;
use tauri::AppHandle;
use tauri_plugin_opener::OpenerExt;
use tauri_plugin_shell::ShellExt;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameLaunch {
    pub id: String,
    pub title: String,
    pub platform: String,
    pub steam_app_id: Option<String>,
    pub epic_app_name: Option<String>,
    pub launch_uri: Option<String>,
}

fn open_uri(app: &AppHandle, uri: &str) -> Result<(), String> {
    log::info!("Opening URI: {uri}");

    if let Err(err) = app.opener().open_url(uri, None::<&str>) {
        log::warn!("opener failed ({err}); trying shell.open");
        app.shell()
            .open(uri, None)
            .map_err(|e| format!("Failed to open {uri}: {e}"))?;
    }

    Ok(())
}

fn launch_ps_remote_play(app: &AppHandle) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let _ = app;
        log::info!("Launching PS Remote Play.app via open -a");
        std::process::Command::new("open")
            .args(["-a", "PS Remote Play"])
            .spawn()
            .map_err(|e| format!("Could not start PS Remote Play: {e}"))?;
        return Ok(());
    }

    #[cfg(target_os = "windows")]
    {
        if open_uri(app, "psremoteplay://").is_ok() {
            return Ok(());
        }

        let candidates = [
            r"C:\Program Files (x86)\RemotePlay\RemotePlay.exe",
            r"C:\Program Files\RemotePlay\RemotePlay.exe",
            r"C:\Program Files (x86)\Sony\PlayStation Remote Play\RemotePlay.exe",
            r"C:\Program Files\Sony\PlayStation Remote Play\RemotePlay.exe",
        ];

        for path in candidates {
            if std::path::Path::new(path).exists() {
                log::info!("Launching RemotePlay.exe at {path}");
                std::process::Command::new(path)
                    .spawn()
                    .map_err(|e| format!("Failed to execute {path}: {e}"))?;
                return Ok(());
            }
        }

        return Err(
            "PS Remote Play was not found. Install PlayStation Remote Play or register the psremoteplay:// handler."
                .into(),
        );
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        open_uri(app, "psremoteplay://")
    }
}

fn resolve_target(game: &GameLaunch) -> String {
    if let Some(uri) = game
        .launch_uri
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
    {
        return uri.to_string();
    }

    match game.platform.as_str() {
        "steam" => game
            .steam_app_id
            .as_deref()
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .map(|id| format!("steam://run/{id}"))
            .unwrap_or_else(|| "steam://".into()),
        "epic" => game
            .epic_app_name
            .as_deref()
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .map(|name| {
                format!("com.epicgames.launcher://apps/{name}?action=launch&silent=true")
            })
            .unwrap_or_else(|| "com.epicgames.launcher://".into()),
        _ => String::new(),
    }
}

#[tauri::command]
pub fn launch_game(app: AppHandle, game: GameLaunch) -> Result<String, String> {
    let platform_label = match game.platform.as_str() {
        "steam" => "Steam",
        "epic" => "Epic Games",
        "ps5" => "PlayStation 5",
        other => other,
    };

    log::info!(
        "Launch requested id={} title='{}' platform={}",
        game.id,
        game.title,
        game.platform
    );

    let message = format!("Launching {} on {}...", game.title, platform_label);

    match game.platform.as_str() {
        "ps5" => launch_ps_remote_play(&app)?,
        "steam" | "epic" => {
            let target = resolve_target(&game);
            if target.is_empty() {
                return Err(format!("No launch target resolved for {}", game.title));
            }
            open_uri(&app, &target)?;
        }
        other => {
            return Err(format!("Unsupported platform: {other}"));
        }
    }

    log::info!("{message}");
    Ok(message)
}
