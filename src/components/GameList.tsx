import { useState } from "react";
import type { Game } from "../types/game";
import { formatLastPlayed, formatPlaytime, PLATFORM_LABEL } from "../lib/catalog";
import { PlatformIcon } from "./PlatformIcon";

interface GameListProps {
  games: Game[];
  launchingId: string | null;
  onPlay: (game: Game) => void;
  onFavorite: (game: Game) => void;
}

const PLATFORM_COLOR: Record<Game["platform"], string> = {
  steam: "#1B9BFF",
  epic: "#C6C6C6",
  ps5: "#0070D1",
};

export function GameList({ games, launchingId, onPlay, onFavorite }: GameListProps) {
  if (games.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-ink-3">
        <p className="text-[15px] font-semibold text-[#5A647A]">No games found</p>
        <p className="mt-1 text-xs text-[#3A4050]">Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {games.map((game) => (
        <ListRow
          key={game.id}
          game={game}
          launching={launchingId === game.id}
          onPlay={onPlay}
          onFavorite={onFavorite}
        />
      ))}
    </div>
  );
}

function ListRow({
  game,
  launching,
  onPlay,
  onFavorite,
}: {
  game: Game;
  launching: boolean;
  onPlay: (game: Game) => void;
  onFavorite: (game: Game) => void;
}) {
  const [brokenImage, setBrokenImage] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="flex items-center gap-4 rounded-xl px-4 py-3"
      style={{
        background: hovered ? "rgba(124,58,237,0.06)" : "#141820",
        border: hovered ? "1px solid rgba(124,58,237,0.25)" : "1px solid #1E2330",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="h-[52px] w-[52px] shrink-0 overflow-hidden rounded-lg bg-canvas">
        {brokenImage ? null : (
          <img
            src={game.coverUrl}
            alt={game.title}
            className="h-full w-full object-cover"
            onError={() => setBrokenImage(true)}
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{game.title}</p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          <span className="rounded-[10px] border border-line bg-white/5 px-[7px] py-px text-[10px] text-[#5A647A]">
            {game.genre ?? "Game"}
          </span>
        </div>
      </div>

      <div className="hidden w-36 items-center gap-2 sm:flex">
        <PlatformIcon platform={game.platform} size={14} />
        <span className="text-xs font-medium" style={{ color: PLATFORM_COLOR[game.platform] }}>
          {PLATFORM_LABEL[game.platform]}
        </span>
      </div>

      <div className="hidden w-24 text-right sm:block">
        <p className="text-[13px] font-semibold text-ink-2">{formatPlaytime(game.playtimeHours)}</p>
        <p className="text-[10px] text-ink-3">played</p>
      </div>

      <div className="hidden w-20 text-right sm:block">
        <p className="text-[11px] text-ink-3">Last played</p>
        <p className="text-xs font-medium text-[#6B7280]">{formatLastPlayed(game.lastPlayed)}</p>
      </div>

      <div className="hidden w-16 items-center justify-end gap-1.5 sm:flex">
        <svg width="11" height="11" viewBox="0 0 11 11" fill="#F59E0B">
          <path d="M5.5 1l1.2 2.5 2.8.4-2 2 .5 2.8L5.5 7.4 2.5 8.7l.5-2.8-2-2 2.8-.4z" />
        </svg>
        <span className="text-xs font-semibold text-[#C8D0E0]">
          {game.rating ? game.rating.toFixed(1) : "—"}
        </span>
      </div>

      <div className="flex items-center gap-2" style={{ opacity: hovered ? 1 : 0 }}>
        <button
          type="button"
          onClick={() => onPlay(game)}
          disabled={launching}
          className="rounded-lg px-3.5 py-1.5 text-[11px] font-bold tracking-[0.04em] text-white disabled:opacity-70"
          style={{ background: "linear-gradient(135deg, #7C3AED, #5B21B6)" }}
        >
          {launching ? "..." : "PLAY"}
        </button>
        <button
          type="button"
          onClick={() => onFavorite(game)}
          className="flex h-[30px] w-[30px] items-center justify-center rounded-lg"
          style={{
            background: game.favorite ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.05)",
            border: game.favorite ? "1px solid rgba(239,68,68,0.3)" : "1px solid #2A2F3B",
          }}
        >
          <svg width="12" height="11" viewBox="0 0 12 11" fill="none">
            <path
              d="M6 10S1 6.8 1 3.5A2.5 2.5 0 0 1 6 2.17 2.5 2.5 0 0 1 11 3.5C11 6.8 6 10 6 10z"
              fill={game.favorite ? "#EF4444" : "transparent"}
              stroke={game.favorite ? "#EF4444" : "#5A647A"}
              strokeWidth="1.2"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
