import type { Game } from "../types/game";
import { GameCard } from "./GameCard";

interface GameGridProps {
  games: Game[];
  launchingId: string | null;
  onPlay: (game: Game) => void;
}

export function GameGrid({ games, launchingId, onPlay }: GameGridProps) {
  if (games.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-16 text-center text-zinc-400 backdrop-blur-xl">
        No games match that search or filter.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {games.map((game) => (
        <GameCard
          key={game.id}
          game={game}
          launching={launchingId === game.id}
          onPlay={onPlay}
        />
      ))}
    </div>
  );
}
