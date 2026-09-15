import { invoke } from "@tauri-apps/api/core";
import catalog from "../data/games.json";
import { emptySnapshot, type AuthUser, type Game, type Snapshot } from "../types/game";
import { restoreSupabaseUser, signOutSupabase } from "./supabaseAuth";

const PREVIEW_KEY = "vault-preview-snapshot";

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function readPreview(): Snapshot {
  try {
    const raw = localStorage.getItem(PREVIEW_KEY);
    return raw ? ({ ...emptySnapshot(), ...(JSON.parse(raw) as Snapshot) } as Snapshot) : emptySnapshot();
  } catch {
    return emptySnapshot();
  }
}

function writePreview(snapshot: Snapshot): Snapshot {
  localStorage.setItem(PREVIEW_KEY, JSON.stringify(snapshot));
  return snapshot;
}

function previewUser(provider: AuthUser["provider"], displayName: string, email?: string): AuthUser {
  const parts = displayName.split(" ").filter(Boolean);
  const initials =
    parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : displayName.slice(0, 2).toUpperCase();
  return { provider, displayName, email, initials };
}

async function call<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri()) {
      throw new Error("Sign-in and library import run inside the Game Library desktop app.");
  }
  return invoke<T>(command, args);
}

export async function getSnapshot(): Promise<Snapshot> {
  const snapshot = !isTauri() ? readPreview() : await call<Snapshot>("get_snapshot");
  if (!snapshot.user) {
    const supabaseUser = await restoreSupabaseUser();
    if (supabaseUser) {
      snapshot.user = supabaseUser;
    }
  }
  return snapshot;
}

export async function googleLogin(clientId?: string): Promise<Snapshot> {
  if (!isTauri()) {
    const snapshot = {
      ...readPreview(),
      user: previewUser("google", "Alex Mercer", "alex@gmail.com"),
      pendingLibraryPrompt: "google",
    };
    return writePreview(snapshot);
  }
  return call<Snapshot>("google_login", { clientId: clientId || null });
}

export const saveGoogleClientId = (clientId: string) => call<void>("save_google_client_id", { clientId });

export async function signOut(): Promise<Snapshot> {
  await signOutSupabase();
  if (!isTauri()) {
    return writePreview(emptySnapshot());
  }
  return call<Snapshot>("sign_out");
}

export async function steamLogin(): Promise<Snapshot> {
  if (!isTauri()) {
    const sample = catalog as Game[];
    const games = sample.filter((game) => game.platform === "steam");
    const snapshot = readPreview();
    snapshot.user = snapshot.user ?? previewUser("steam", "Steam Player");
    snapshot.steam = {
      connected: true,
      label: "Steam Player",
      gameCount: games.length,
      needsAction: null,
    };
    snapshot.games = [...snapshot.games.filter((game) => game.platform !== "steam"), ...games];
    snapshot.pendingLibraryPrompt = "steam";
    return writePreview(snapshot);
  }
  return call<Snapshot>("steam_login");
}
export const steamSaveApiKey = (apiKey: string) =>
  call<Snapshot>("steam_save_api_key", { apiKey });
export const steamOpenApiKeyPage = () => call<void>("steam_open_api_key_page");
export const epicBeginLogin = () => {
  if (!isTauri()) {
    return Promise.resolve();
  }
  return call<void>("epic_begin_login");
};
export async function epicLogin(): Promise<Snapshot> {
  if (!isTauri()) {
    const snapshot = readPreview();
    const sample = catalog as Game[];
    const games = sample.filter((game) => game.platform === "epic");
    snapshot.user = snapshot.user ?? previewUser("epic", "Epic Player");
    snapshot.games = [...snapshot.games.filter((game) => game.platform !== "epic"), ...games];
    snapshot.epic = {
      connected: true,
      label: snapshot.epic.label || "Epic Player",
      gameCount: games.length,
      needsAction: null,
    };
    snapshot.pendingLibraryPrompt = null;
    return writePreview(snapshot);
  }
  return call<Snapshot>("epic_login");
}
export async function epicCompleteLogin(authorizationCode: string): Promise<Snapshot> {
  if (!isTauri()) {
    return epicLogin();
  }
  if (authorizationCode.trim().length < 4) {
    throw new Error("Paste the Epic authorizationCode after signing in.");
  }
  return call<Snapshot>("epic_complete_login", { authorizationCode });
}
export const psnBeginLogin = () => {
  if (!isTauri()) {
    return Promise.resolve("https://ca.account.sony.com/api/v1/ssocookie");
  }
  return call<string>("psn_begin_login");
};
export const psnOpenNpssoPage = () => {
  if (!isTauri()) {
    window.open("https://ca.account.sony.com/api/v1/ssocookie", "_blank");
    return Promise.resolve();
  }
  return call<void>("psn_open_npsso_page");
};
export async function psnCompleteLogin(npsso: string): Promise<Snapshot> {
  if (!isTauri()) {
    if (npsso.trim().length < 8) {
      throw new Error("Paste your PlayStation NPSSO token after signing in.");
    }
    const snapshot = readPreview();
    snapshot.user = snapshot.user ?? previewUser("psn", "PSN Player");
    snapshot.psn = { connected: true, label: "PSN Player", gameCount: 0, needsAction: null };
    snapshot.pendingLibraryPrompt = "psn";
    return writePreview(snapshot);
  }
  return call<Snapshot>("psn_complete_login", { npsso });
}

export async function confirmLibraryImport(provider: string): Promise<Snapshot> {
  if (!isTauri()) {
    const snapshot = readPreview();
    const sample = catalog as Game[];
    if (provider === "epic") {
      const games = sample.filter((game) => game.platform === "epic");
      snapshot.games = [...snapshot.games.filter((game) => game.platform !== "epic"), ...games];
      snapshot.epic = {
        connected: true,
        label: snapshot.epic.label || "Epic Player",
        gameCount: games.length,
        needsAction: null,
      };
    }
    if (provider === "steam") {
      const games = sample.filter((game) => game.platform === "steam");
      snapshot.games = [...snapshot.games.filter((game) => game.platform !== "steam"), ...games];
      snapshot.steam = {
        connected: true,
        label: snapshot.steam.label || "Steam Player",
        gameCount: games.length,
        needsAction: null,
      };
    }
    if (provider === "psn" || provider === "ps5") {
      const games = sample.filter((game) => game.platform === "ps5");
      snapshot.games = [...snapshot.games.filter((game) => game.platform !== "ps5"), ...games];
      snapshot.psn = {
        connected: true,
        label: snapshot.psn.label || "PSN Player",
        gameCount: games.length,
        needsAction: null,
      };
    }
    snapshot.pendingLibraryPrompt = null;
    return writePreview(snapshot);
  }
  return call<Snapshot>("confirm_library_import", { provider });
}

export async function dismissLibraryPrompt(provider: string): Promise<Snapshot> {
  if (!isTauri()) {
    const snapshot = readPreview();
    snapshot.pendingLibraryPrompt = null;
    return writePreview(snapshot);
  }
  return call<Snapshot>("dismiss_library_prompt", { provider });
}

export const disconnectAccount = (platform: string) =>
  call<Snapshot>("disconnect_account", { platform });
export const refreshConnected = () => call<Snapshot>("refresh_connected");
