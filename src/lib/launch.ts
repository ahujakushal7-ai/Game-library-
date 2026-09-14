import { invoke } from "@tauri-apps/api/core";
import type { Game } from "../types/game";
import { PLATFORM_LABEL } from "./catalog";

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function resolveLaunchTarget(game: Game): string {
  const explicit = game.launchUri?.trim();
  if (explicit) {
    return explicit;
  }

  switch (game.platform) {
    case "steam":
      return game.steamAppId?.trim()
        ? `steam://run/${game.steamAppId.trim()}`
        : "steam://";
    case "epic":
      return game.epicAppName?.trim()
        ? `com.epicgames.launcher://apps/${game.epicAppName.trim()}?action=launch&silent=true`
        : "com.epicgames.launcher://";
    case "ps5":
      return "psremoteplay://";
  }
}

export async function launchGame(game: Game): Promise<string> {
  const fallbackMessage = `Launching ${game.title} on ${PLATFORM_LABEL[game.platform]}...`;

  if (isTauri()) {
    return invoke<string>("launch_game", { game });
  }

  const target = resolveLaunchTarget(game);
  console.info("[launch]", game.title, game.platform, target);

  try {
    const link = document.createElement("a");
    link.href = target;
    link.rel = "noreferrer";
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    console.error("Browser launch failed", error);
    throw new Error(`Could not open ${target}`);
  }

  return fallbackMessage;
}
