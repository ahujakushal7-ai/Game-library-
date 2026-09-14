import { useState } from "react";
import type { Game } from "../types/game";
import { PlatformBadge } from "./PlatformBadge";

interface GameCardProps {
  game: Game;
  launching: boolean;
  onPlay: (game: Game) => void;
}

export function GameCard({ game, launching, onPlay }: GameCardProps) {
  const [brokenImage, setBrokenImage] = useState(false);

  return (
    <article className="group relative">
      <div className="relative aspect-[2/3] overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-[0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl transition duration-300 ease-out group-hover:-translate-y-1.5 group-hover:border-white/25 group-hover:shadow-[0_28px_60px_rgba(0,0,0,0.55)]">
        {brokenImage ? (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-zinc-800 to-[#0D1117] px-4 text-center text-lg font-semibold text-zinc-300">
            {game.title}
          </div>
        ) : (
          <img
            src={game.coverUrl}
            alt={game.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
            onError={() => setBrokenImage(true)}
          />
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

        <div className="absolute left-3 top-3">
          <PlatformBadge platform={game.platform} />
        </div>

        <div className="absolute inset-x-0 bottom-0 p-3">
          <h3 className="mb-3 line-clamp-2 text-sm font-semibold leading-snug text-white drop-shadow">
            {game.title}
          </h3>
          <button
            type="button"
            onClick={() => onPlay(game)}
            disabled={launching}
            className="w-full rounded-xl bg-white/15 px-3 py-2 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/25 disabled:cursor-wait disabled:opacity-70"
          >
            {launching ? "Launching..." : "Play"}
          </button>
        </div>
      </div>
    </article>
  );
}
