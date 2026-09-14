import { useMemo, useState } from "react";
import type { Game, PlatformFilter, SortMode, ViewMode } from "../types/game";

interface TopBarProps {
  games: Game[];
  query: string;
  platform: PlatformFilter;
  sort: SortMode;
  view: ViewMode;
  onQueryChange: (value: string) => void;
  onPlatformChange: (value: PlatformFilter) => void;
  onSortChange: (value: SortMode) => void;
  onViewChange: (value: ViewMode) => void;
}

const PLATFORMS: { id: PlatformFilter; label: string; active: string }[] = [
  { id: "all", label: "All", active: "bg-white/15 text-white" },
  { id: "steam", label: "Steam", active: "bg-[#1b2838] text-[#66c0f4]" },
  { id: "epic", label: "Epic", active: "bg-zinc-800 text-white" },
  { id: "ps5", label: "PS5", active: "bg-[#0070D1] text-white" },
];

export function TopBar({
  games,
  query,
  platform,
  sort,
  view,
  onQueryChange,
  onPlatformChange,
  onSortChange,
  onViewChange,
}: TopBarProps) {
  const [open, setOpen] = useState(false);
  const suggestions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length < 1) {
      return [];
    }
    return games
      .filter((game) => game.title.toLowerCase().includes(needle))
      .slice(0, 6);
  }, [games, query]);

  return (
    <header className="flex flex-col gap-3 border-b border-white/8 bg-[#0d0b16]/80 px-6 py-4 backdrop-blur-xl">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <input
            value={query}
            onChange={(event) => {
              onQueryChange(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => window.setTimeout(() => setOpen(false), 120)}
            placeholder="Search the vault..."
            className="w-full rounded-2xl border border-white/10 bg-[#161325] px-4 py-2.5 text-sm outline-none placeholder:text-[#6f6b82] focus:border-[#7c5cff]/70"
          />
          {open && suggestions.length > 0 ? (
            <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-white/10 bg-[#161325] shadow-2xl">
              {suggestions.map((game) => (
                <button
                  key={game.id}
                  type="button"
                  onMouseDown={() => {
                    onQueryChange(game.title);
                    setOpen(false);
                  }}
                  className="block w-full px-4 py-2 text-left text-sm text-[#f4f1ff] hover:bg-[#7c5cff]/20"
                >
                  {game.title}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <select
          value={sort}
          onChange={(event) => onSortChange(event.target.value as SortMode)}
          className="rounded-xl border border-white/10 bg-[#161325] px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] outline-none"
        >
          <option value="recent">Recently Played</option>
          <option value="az">Alphabetical</option>
          <option value="playtime">Playtime</option>
        </select>

        <div className="flex rounded-xl border border-white/10 bg-[#161325] p-1">
          <button
            type="button"
            onClick={() => onViewChange("grid")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${view === "grid" ? "bg-[#7c5cff] text-white" : "text-[#b7b3c9]"}`}
          >
            Grid
          </button>
          <button
            type="button"
            onClick={() => onViewChange("list")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${view === "list" ? "bg-[#7c5cff] text-white" : "text-[#b7b3c9]"}`}
          >
            List
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {PLATFORMS.map((item) => {
          const active = platform === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onPlatformChange(item.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] ${
                active ? item.active : "bg-white/5 text-[#b7b3c9]"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </header>
  );
}
