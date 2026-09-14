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
  const [hovered, setHovered] = useState(false);
  const meta =
    game.platform === "ps5"
      ? game.trophies
        ? `${game.trophies} trophies`
        : "PS Remote Play"
      : formatPlaytime(game.playtimeHours);

  return (
    <article
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border bg-surface transition-[transform,border-color,box-shadow] duration-200"
      style={{
        borderColor: hovered ? "rgba(124,58,237,0.6)" : "#2A2F3B",
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
        boxShadow: hovered
          ? "0 8px 32px rgba(124,58,237,0.25), 0 0 0 1px rgba(124,58,237,0.2)"
          : "0 2px 8px rgba(0,0,0,0.3)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative aspect-2/3 overflow-hidden bg-canvas">
        {brokenImage ? (
          <div className="flex h-full items-center justify-center px-3 text-center text-sm font-semibold text-ink">
            {game.title}
          </div>
        ) : (
          <img
            src={game.coverUrl}
            alt={game.title}
            className="h-full w-full object-cover transition-transform duration-300"
            style={{ transform: hovered ? "scale(1.06)" : "scale(1)" }}
            onError={() => setBrokenImage(true)}
          />
        )}

        <div
          className="absolute inset-0"
          style={{
            background: hovered
              ? "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.8) 75%, rgba(0,0,0,0.97) 100%)"
              : "linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.8) 80%, rgba(0,0,0,0.95) 100%)",
          }}
        />

        {game.installed ? (
          <span className="absolute top-2.5 left-2.5 h-2 w-2 rounded-full border border-black/40 bg-emerald-500 shadow-[0_0_5px_#22C55E]" />
        ) : null}

        <div className="absolute top-2.5 right-2.5">
          <PlatformBadge platform={game.platform} />
        </div>

        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ opacity: hovered ? 1 : 0 }}
        >
          <button
            type="button"
            onClick={() => onPlay(game)}
            disabled={launching}
            className="flex items-center gap-2 rounded-[28px] px-5 py-[9px] text-xs font-bold tracking-[0.04em] text-white shadow-[0_4px_16px_rgba(124,58,237,0.5)] disabled:opacity-70"
            style={{ background: "linear-gradient(135deg, #7C3AED, #5B21B6)" }}
          >
            <svg width="11" height="13" viewBox="0 0 11 13" fill="white">
              <path d="M1 1.5l9 5-9 5V1.5z" />
            </svg>
            {launching ? "LAUNCHING" : "PLAY"}
          </button>
        </div>

        <div className="absolute inset-x-0 bottom-0 px-3 pt-6 pb-3">
          <h3 className="mb-1 truncate text-xs font-bold leading-snug text-ink">{game.title}</h3>
          <div className="flex items-center justify-between gap-2">
            <span className="rounded-[10px] bg-white/7 px-1.5 py-px text-[9px] font-medium text-ink-2">
              {game.genre ?? "Game"}
            </span>
            <span className="whitespace-nowrap text-[9px] font-medium text-[#6B7280]">{meta}</span>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onFavorite(game);
        }}
        aria-label="Favorite"
        className="absolute right-3 bottom-3 flex h-[26px] w-[26px] items-center justify-center rounded-full backdrop-blur-md"
        style={{
          background: game.favorite ? "rgba(239,68,68,0.2)" : "rgba(0,0,0,0.4)",
          border: game.favorite ? "1px solid rgba(239,68,68,0.4)" : "1px solid rgba(255,255,255,0.1)",
          opacity: hovered || game.favorite ? 1 : 0,
          transform: game.favorite ? "scale(1.1)" : "scale(1)",
        }}
      >
        <svg width="12" height="11" viewBox="0 0 12 11" fill="none">
          <path
            d="M6 10S1 6.8 1 3.5A2.5 2.5 0 0 1 6 2.17 2.5 2.5 0 0 1 11 3.5C11 6.8 6 10 6 10z"
            fill={game.favorite ? "#EF4444" : "transparent"}
            stroke={game.favorite ? "#EF4444" : "rgba(255,255,255,0.6)"}
            strokeWidth="1.2"
          />
        </svg>
      </button>
    </article>
  );
}
