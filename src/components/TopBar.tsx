import { useEffect, useMemo, useRef, useState } from "react";
import type { Game, PlatformFilter, SortMode, ViewMode } from "../types/game";

interface TopBarProps {
  games: Game[];
  gameCount: number;
  query: string;
  platform: PlatformFilter;
  sort: SortMode;
  view: ViewMode;
  onQueryChange: (value: string) => void;
  onPlatformChange: (value: PlatformFilter) => void;
  onSortChange: (value: SortMode) => void;
  onViewChange: (value: ViewMode) => void;
}

const PLATFORMS: { id: PlatformFilter; label: string; color: string; rgb: string }[] = [
  { id: "all", label: "All Platforms", color: "#7C3AED", rgb: "124,58,237" },
  { id: "steam", label: "Steam", color: "#1B9BFF", rgb: "27,155,255" },
  { id: "epic", label: "Epic", color: "#C6C6C6", rgb: "198,198,198" },
  { id: "ps5", label: "PlayStation 5", color: "#0070D1", rgb: "0,112,209" },
];

const SORTS: { id: SortMode; label: string }[] = [
  { id: "recent", label: "Recently Played" },
  { id: "az", label: "Alphabetical" },
  { id: "playtime", label: "Playtime" },
];

export function TopBar({
  games,
  gameCount,
  query,
  platform,
  sort,
  view,
  onQueryChange,
  onPlatformChange,
  onSortChange,
  onViewChange,
}: TopBarProps) {
  const [focused, setFocused] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const suggestions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length < 1) {
      return [];
    }
    return games.filter((game) => game.title.toLowerCase().includes(needle)).slice(0, 5);
  }, [games, query]);
  const sortLabel = SORTS.find((item) => item.id === sort)?.label ?? "Recently Played";

  useEffect(() => {
    const onPointer = (event: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setSortOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, []);

  return (
    <header className="flex shrink-0 flex-col border-b border-surface-raised bg-sidebar">
      <div className="flex items-center gap-4 px-6 py-4">
        <div className="relative max-w-md flex-1">
          <div
            className={`flex h-10 items-center gap-3 rounded-xl px-4 ${
              focused ? "border border-accent/50 shadow-[0_0_0_3px_rgba(124,58,237,0.1)]" : "border border-line"
            } bg-surface`}
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <circle cx="6.5" cy="6.5" r="5" stroke="#4E5670" strokeWidth="1.5" />
              <path d="M10.5 10.5l3 3" stroke="#4E5670" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => window.setTimeout(() => setFocused(false), 150)}
              placeholder="Search your library…"
              className="w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-3"
            />
            {query ? (
              <button type="button" onClick={() => onQueryChange("")} className="text-ink-3">
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path d="M2 2l9 9M11 2l-9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            ) : null}
          </div>
          {focused && suggestions.length > 0 ? (
            <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-line bg-surface shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
              {suggestions.map((game) => (
                <button
                  key={game.id}
                  type="button"
                  onMouseDown={() => onQueryChange(game.title)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[13px] text-[#C8D0E0] hover:bg-accent/10"
                >
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <circle cx="5.5" cy="5.5" r="4" stroke="#4E5670" strokeWidth="1.3" />
                    <path d="M9 9l2.5 2.5" stroke="#4E5670" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                  {game.title}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex-1" />

        <p className="whitespace-nowrap text-xs font-medium text-ink-3">
          <span className="font-semibold text-ink-2">{gameCount}</span> games
        </p>

        <div ref={sortRef} className="relative">
          <button
            type="button"
            onClick={() => setSortOpen((open) => !open)}
            className={`flex h-9 items-center gap-2 rounded-xl px-4 text-xs font-medium text-ink-2 ${
              sortOpen ? "border border-accent/40" : "border border-line"
            } bg-surface`}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M1 3h11M3 6.5h7M5 10h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            {sortLabel}
            <svg
              width="11"
              height="11"
              viewBox="0 0 11 11"
              fill="none"
              className={sortOpen ? "rotate-180" : ""}
            >
              <path d="M2 4l3.5 3.5L9 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
          {sortOpen ? (
            <div className="absolute right-0 z-50 mt-1 min-w-[180px] overflow-hidden rounded-xl border border-line bg-surface shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
              {SORTS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSortChange(item.id);
                    setSortOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-xs ${
                    item.id === sort ? "bg-accent/10 text-accent-soft" : "text-ink-2 hover:bg-white/4"
                  }`}
                >
                  {item.label}
                  {item.id === sort ? (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="#A78BFA" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  ) : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-line bg-surface p-1">
          {(["grid", "list"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onViewChange(mode)}
              className={`flex h-7 w-[30px] items-center justify-center rounded-lg ${
                view === mode
                  ? "border border-accent/30 bg-accent/20 text-accent-soft"
                  : "border border-transparent text-ink-3"
              }`}
              aria-label={mode}
            >
              {mode === "grid" ? (
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <rect x="1" y="1" width="4.5" height="4.5" rx="1" fill="currentColor" />
                  <rect x="7.5" y="1" width="4.5" height="4.5" rx="1" fill="currentColor" />
                  <rect x="1" y="7.5" width="4.5" height="4.5" rx="1" fill="currentColor" />
                  <rect x="7.5" y="7.5" width="4.5" height="4.5" rx="1" fill="currentColor" />
                </svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <rect x="1" y="2" width="11" height="2.5" rx="1" fill="currentColor" />
                  <rect x="1" y="5.5" width="11" height="2.5" rx="1" fill="currentColor" />
                  <rect x="1" y="9" width="11" height="2.5" rx="1" fill="currentColor" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 px-6 pb-4">
        {PLATFORMS.map((item) => {
          const active = platform === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onPlatformChange(item.id)}
              className="flex h-[30px] items-center gap-1.5 rounded-full px-4 text-xs"
              style={{
                background: active ? `rgba(${item.rgb},0.15)` : "rgba(255,255,255,0.04)",
                border: active ? `1px solid ${item.color}55` : "1px solid #2A2F3B",
                color: active ? item.color : "#5A647A",
                fontWeight: active ? 600 : 400,
              }}
            >
              {item.id !== "all" ? (
                <span className="inline-block h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: item.color }} />
              ) : null}
              {item.label}
            </button>
          );
        })}
      </div>
    </header>
  );
}
