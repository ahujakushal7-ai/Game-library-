import type { PlatformFilter, SortMode } from "../types/game";

const FILTERS: { id: PlatformFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "steam", label: "Steam" },
  { id: "epic", label: "Epic" },
  { id: "ps5", label: "PS5" },
];

interface LibraryControlsProps {
  query: string;
  platform: PlatformFilter;
  sort: SortMode;
  onQueryChange: (value: string) => void;
  onPlatformChange: (value: PlatformFilter) => void;
  onSortChange: (value: SortMode) => void;
}

export function LibraryControls({
  query,
  platform,
  sort,
  onQueryChange,
  onPlatformChange,
  onSortChange,
}: LibraryControlsProps) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="relative min-w-0 flex-1">
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search your library..."
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none backdrop-blur-xl placeholder:text-zinc-500 focus:border-white/30"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((filter) => {
          const active = platform === filter.id;
          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => onPlatformChange(filter.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] transition ${
                active
                  ? "border-white/40 bg-white/15 text-white"
                  : "border-white/10 bg-white/5 text-zinc-400 hover:text-white"
              }`}
            >
              {filter.label}
            </button>
          );
        })}

        <label className="sr-only" htmlFor="sort">
          Sort
        </label>
        <select
          id="sort"
          value={sort}
          onChange={(event) => onSortChange(event.target.value as SortMode)}
          className="rounded-full border border-white/10 bg-[#161b22] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-200 outline-none"
        >
          <option value="az">A–Z</option>
          <option value="recent">Recently Played</option>
        </select>
      </div>
    </div>
  );
}
