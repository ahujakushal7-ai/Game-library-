use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Game {
    pub id: String,
    pub title: String,
    pub platform: String,
    pub cover_url: String,
    pub last_played: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub steam_app_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub epic_app_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub launch_uri: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SteamConnection {
    pub steam_id: String,
    pub persona_name: String,
    pub api_key: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct EpicConnection {
    pub display_name: String,
    pub account_id: String,
    pub access_token: String,
    pub refresh_token: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct PsnConnection {
    pub online_id: String,
    pub npsso: String,
    pub access_token: String,
    pub refresh_token: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct AppStore {
    pub steam: Option<SteamConnection>,
    pub epic: Option<EpicConnection>,
    pub psn: Option<PsnConnection>,
    pub games: Vec<Game>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AccountStatus {
    pub connected: bool,
    pub label: String,
    pub game_count: u32,
    pub needs_action: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    pub steam: AccountStatus,
    pub epic: AccountStatus,
    pub psn: AccountStatus,
    pub games: Vec<Game>,
}

impl AppStore {
    pub fn snapshot(&self) -> Snapshot {
        let steam_count = count_platform(&self.games, "steam");
        let epic_count = count_platform(&self.games, "epic");
        let psn_count = count_platform(&self.games, "ps5");

        Snapshot {
            steam: AccountStatus {
                connected: self.steam.is_some(),
                label: self
                    .steam
                    .as_ref()
                    .map(|s| {
                        if s.persona_name.is_empty() {
                            s.steam_id.clone()
                        } else {
                            s.persona_name.clone()
                        }
                    })
                    .unwrap_or_default(),
                game_count: steam_count,
                needs_action: self.steam.as_ref().and_then(|s| {
                    if s.api_key.as_deref().unwrap_or("").is_empty() {
                        Some("Add a Steam Web API key to import your full owned library.".into())
                    } else {
                        None
                    }
                }),
            },
            epic: AccountStatus {
                connected: self.epic.is_some(),
                label: self
                    .epic
                    .as_ref()
                    .map(|e| e.display_name.clone())
                    .unwrap_or_default(),
                game_count: epic_count,
                needs_action: None,
            },
            psn: AccountStatus {
                connected: self.psn.is_some(),
                label: self
                    .psn
                    .as_ref()
                    .map(|p| p.online_id.clone())
                    .unwrap_or_default(),
                game_count: psn_count,
                needs_action: None,
            },
            games: self.games.clone(),
        }
    }

    pub fn replace_platform_games(&mut self, platform: &str, incoming: Vec<Game>) {
        self.games.retain(|game| game.platform != platform);
        self.games.extend(incoming);
        self.games
            .sort_by(|a, b| a.title.to_lowercase().cmp(&b.title.to_lowercase()));
    }
}

fn count_platform(games: &[Game], platform: &str) -> u32 {
    games.iter().filter(|game| game.platform == platform).count() as u32
}
