import { useState } from "react";
import type { Game } from "../types/game";
import { formatPlaytime } from "../lib/catalog";
import { PlatformBadge } from "./PlatformBadge";

interface GameCardProps {
  game: Game;
  launching: boolean;
  onPlay: (game: Game) => void;
  onFavorite: (game: Game) => void;
}

export function GameCard({ game, launching, onPlay, onFavorite }: GameCardProps) {
  const [brokenImage, setBrokenImage] = useState(false);
  const meta =
    game.platform === "ps5"
      ? game.trophies
        ? `${game.trophies} trophies`
        : "PS Remote Play"
      : formatPlaytime(game.playtimeHours);

  return (
    <article className="group relative">
      <div className="relative aspect-[2/3] overflow-hidden rounded-2xl border border-white/8 bg-[#161325] shadow-[0_18px_40px_rgba(0,0,0,0.45)] transition duration-300 group-hover:-translate-y-1.5 group-hover:border-[#7c5cff]/70 group-hover:shadow-[0_20px_50px_rgba(124,92,255,0.28)]">
        {brokenImage ? (
          <div className="flex h-full items-center justify-center bg-[#1b1730] px-4 text-center text-lg font-semibold">
            {game.title}
          </div>
        ) : (
          <img
            src={game.coverUrl}
            alt={game.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.06]"
            onError={() => setBrokenImage(true)}
          />
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0a0912] via-[#0a0912]/20 to-transparent" />

        <div className="absolute right-3 top-3 flex items-center gap-2">
          {game.installed ? (
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
          ) : null}
          <PlatformBadge platform={game.platform} />
        </div>

        <button
          type="button"
          onClick={() => onFavorite(game)}
          className="absolute left-3 top-3 hidden h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md group-hover:flex"
          aria-label="Favorite"
        >
          {game.favorite ? "♥" : "♡"}
        </button>

        <div className="absolute inset-x-0 bottom-0 p-3">
          <h3 className="line-clamp-2 font-[Syne] text-sm font-bold leading-snug text-white">
            {game.title}
          </h3>
          <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-[#b7b3c9]">
            <span className="rounded-full bg-white/10 px-2 py-0.5">{game.genre ?? "Game"}</span>
            <span>{meta}</span>
          </div>
          <button
            type="button"
            onClick={() => onPlay(game)}
            disabled={launching}
            className="mt-3 hidden w-full rounded-xl bg-[#7c5cff] px-3 py-2 text-sm font-semibold text-white group-hover:block disabled:opacity-70"
          >
            {launching ? "Launching..." : "Play"}
          </button>
        </div>
      </div>
    </article>
  );
}
