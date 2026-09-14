import { useState } from "react";
import type { Game } from "../types/game";
import { formatLastPlayed, formatPlaytime, PLATFORM_LABEL } from "../lib/catalog";
import { PlatformBadge } from "./PlatformBadge";

interface GameListProps {
  games: Game[];
  launchingId: string | null;
  onPlay: (game: Game) => void;
  onFavorite: (game: Game) => void;
}

export function GameList({ games, launchingId, onPlay, onFavorite }: GameListProps) {
  if (games.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-16 text-center text-[#b7b3c9]">
        No games match that search or filter.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#12101c]">
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

  return (
    <div className="group grid grid-cols-[64px_1fr_auto] items-center gap-4 border-b border-white/5 px-4 py-3 last:border-b-0 hover:bg-[#7c5cff]/10 sm:grid-cols-[72px_minmax(0,1.4fr)_120px_90px_110px_70px_auto]">
      <div className="h-16 w-12 overflow-hidden rounded-lg bg-[#1b1730] sm:h-[72px] sm:w-14">
        {brokenImage ? null : (
          <img
            src={game.coverUrl}
            alt=""
            className="h-full w-full object-cover"
            onError={() => setBrokenImage(true)}
          />
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate font-[Syne] text-sm font-bold">{game.title}</p>
        <p className="mt-1 text-xs text-[#b7b3c9]">{game.genre ?? "Game"}</p>
      </div>
      <div className="hidden sm:block">
        <PlatformBadge platform={game.platform} />
      </div>
      <p className="hidden text-xs text-[#b7b3c9] sm:block">{formatPlaytime(game.playtimeHours)}</p>
      <p className="hidden text-xs text-[#b7b3c9] sm:block">{formatLastPlayed(game.lastPlayed)}</p>
      <p className="hidden text-xs text-[#f4f1ff] sm:block">
        {game.rating ? game.rating.toFixed(1) : "—"}
      </p>
      <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
        <button
          type="button"
          onClick={() => onFavorite(game)}
          className="rounded-lg bg-white/10 px-2 py-1 text-sm"
        >
          {game.favorite ? "♥" : "♡"}
        </button>
        <button
          type="button"
          onClick={() => onPlay(game)}
          disabled={launching}
          className="rounded-lg bg-[#7c5cff] px-3 py-1.5 text-xs font-semibold"
        >
          {launching ? "..." : "Play"}
        </button>
      </div>
      <span className="sr-only">{PLATFORM_LABEL[game.platform]}</span>
    </div>
  );
}
