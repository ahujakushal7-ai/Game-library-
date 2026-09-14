import type { Game, Platform, PlatformFilter, SortMode } from "../types/game";

export const PLATFORM_LABEL: Record<Platform, string> = {
  steam: "Steam",
  epic: "Epic Games",
  ps5: "PlayStation 5",
};

export function filterAndSortGames(
  games: Game[],
  query: string,
  platform: PlatformFilter,
  sort: SortMode,
): Game[] {
  const needle = query.trim().toLowerCase();

  const filtered = games.filter((game) => {
    const matchesPlatform = platform === "all" || game.platform === platform;
    const matchesQuery = needle.length === 0 || game.title.toLowerCase().includes(needle);
    return matchesPlatform && matchesQuery;
  });

  return filtered.sort((a, b) => {
    if (sort === "az") {
      return a.title.localeCompare(b.title);
    }

    const aTime = a.lastPlayed ? Date.parse(a.lastPlayed) : 0;
    const bTime = b.lastPlayed ? Date.parse(b.lastPlayed) : 0;
    if (aTime === bTime) {
      return a.title.localeCompare(b.title);
    }
    return bTime - aTime;
  });
}
