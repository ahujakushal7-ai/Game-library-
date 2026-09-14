import type { Game } from "../types/game";
import { GameCard } from "./GameCard";

interface GameGridProps {
  games: Game[];
  launchingId: string | null;
  onPlay: (game: Game) => void;
  onFavorite: (game: Game) => void;
}

export function GameGrid({ games, launchingId, onPlay, onFavorite }: GameGridProps) {
  if (games.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-ink-3">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="mb-4 opacity-40">
          <rect x="4" y="4" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="2" />
          <rect x="26" y="4" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="2" />
          <rect x="4" y="26" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="2" />
          <rect x="26" y="26" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="2" />
        </svg>
        <p className="text-[15px] font-semibold text-[#5A647A]">No games found</p>
        <p className="mt-1 text-xs text-[#3A4050]">Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(175px, 1fr))" }}
    >
      {games.map((game) => (
        <GameCard
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
