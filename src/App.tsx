import { useMemo, useState } from "react";
import catalog from "./data/games.json";
import { GameGrid } from "./components/GameGrid";
import { LibraryControls } from "./components/LibraryControls";
import { Toast } from "./components/Toast";
import { filterAndSortGames } from "./lib/catalog";
import { launchGame } from "./lib/launch";
import type { Game, PlatformFilter, SortMode } from "./types/game";

const games = catalog as Game[];

export default function App() {
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState<PlatformFilter>("all");
  const [sort, setSort] = useState<SortMode>("az");
  const [launchingId, setLaunchingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: "info" | "error" } | null>(
    null,
  );

  const visibleGames = useMemo(
    () => filterAndSortGames(games, query, platform, sort),
    [query, platform, sort],
  );

  async function onPlay(game: Game) {
    setLaunchingId(game.id);
    try {
      const message = await launchGame(game);
      setToast({ message, tone: "info" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Launch failed.";
      setToast({ message, tone: "error" });
    } finally {
      setLaunchingId(null);
      window.setTimeout(() => setToast(null), 3200);
    }
  }

  return (
    <div className="min-h-screen bg-[#0D1117] text-zinc-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,_rgba(0,112,209,0.16),_transparent_42%),radial-gradient(circle_at_80%_20%,_rgba(102,192,244,0.12),_transparent_30%)]" />

      <main className="relative mx-auto max-w-7xl px-6 py-8">
        <header className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">
            Aggregated launcher
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
            Game Library
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">
            Launch Steam, Epic Games, and PlayStation 5 titles from one dark, poster-first
            shelf. PS5 games open PlayStation Remote Play.
          </p>
        </header>

        <LibraryControls
          query={query}
          platform={platform}
          sort={sort}
          onQueryChange={setQuery}
          onPlatformChange={setPlatform}
          onSortChange={setSort}
        />

        <p className="mt-5 mb-4 text-xs uppercase tracking-[0.18em] text-zinc-500">
          {visibleGames.length} {visibleGames.length === 1 ? "title" : "titles"}
        </p>

        <GameGrid games={visibleGames} launchingId={launchingId} onPlay={onPlay} />
      </main>

      {toast ? <Toast message={toast.message} tone={toast.tone} /> : null}
    </div>
  );
}
