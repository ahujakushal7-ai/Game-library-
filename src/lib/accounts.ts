import { invoke } from "@tauri-apps/api/core";
import { emptySnapshot, type Snapshot } from "../types/game";

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

async function call<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri()) {
    throw new Error("Sign-in and library import run inside the Windows Game Library app.");
  }
  return invoke<T>(command, args);
}

export async function getSnapshot(): Promise<Snapshot> {
  if (!isTauri()) {
    return emptySnapshot();
  }
  return call<Snapshot>("get_snapshot");
}

export const steamLogin = () => call<Snapshot>("steam_login");
export const steamSaveApiKey = (apiKey: string) =>
  call<Snapshot>("steam_save_api_key", { apiKey });
export const steamOpenApiKeyPage = () => call<void>("steam_open_api_key_page");
export const epicBeginLogin = () => call<void>("epic_begin_login");
export const epicCompleteLogin = (authorizationCode: string) =>
  call<Snapshot>("epic_complete_login", { authorizationCode });
export const psnBeginLogin = () => call<string>("psn_begin_login");
export const psnOpenNpssoPage = () => call<void>("psn_open_npsso_page");
export const psnCompleteLogin = (npsso: string) =>
  call<Snapshot>("psn_complete_login", { npsso });
export const disconnectAccount = (platform: string) =>
  call<Snapshot>("disconnect_account", { platform });
export const refreshConnected = () => call<Snapshot>("refresh_connected");
