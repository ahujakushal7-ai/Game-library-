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
      <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-16 text-center text-[#b7b3c9]">
        No games match that search or filter.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
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
