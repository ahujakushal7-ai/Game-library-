import type { Game, LibraryNav, PlatformFilter, SortMode } from "../types/game";

export const PLATFORM_LABEL: Record<Game["platform"], string> = {
  steam: "Steam",
  epic: "Epic Games",
  ps5: "PlayStation 5",
};

export const GENRES = [
  "Dark Fantasy",
  "Sci-Fi",
  "Cyberpunk",
  "Action",
  "Shooter",
  "Horror",
  "Sports",
] as const;

export function filterAndSortGames(
  games: Game[],
  query: string,
  platform: PlatformFilter,
  sort: SortMode,
  nav: LibraryNav,
  genre: string | null,
): Game[] {
  const needle = query.trim().toLowerCase();
  const recentCutoff = Date.now() - 1000 * 60 * 60 * 24 * 21;

  const filtered = games.filter((game) => {
    const matchesPlatform = platform === "all" || game.platform === platform;
    const matchesQuery = needle.length === 0 || game.title.toLowerCase().includes(needle);
    const matchesGenre = !genre || game.genre === genre;
    const matchesNav =
      nav === "all" ||
      (nav === "installed" && Boolean(game.installed)) ||
      (nav === "favorites" && Boolean(game.favorite)) ||
      (nav === "recent" && Boolean(game.lastPlayed && Date.parse(game.lastPlayed) >= recentCutoff));
    return matchesPlatform && matchesQuery && matchesGenre && matchesNav;
  });

  return filtered.sort((a, b) => {
    if (sort === "playtime") {
      return (b.playtimeHours ?? 0) - (a.playtimeHours ?? 0);
    }
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

export function formatLastPlayed(value: string | null): string {
  if (!value) {
    return "Never played";
  }
  const date = new Date(value);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatPlaytime(hours?: number): string {
  if (!hours) {
    return "0h";
  }
  return `${hours.toFixed(hours >= 10 ? 0 : 1)}h`;
}
