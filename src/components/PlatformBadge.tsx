import type { Platform } from "../types/game";
import { PlatformIcon } from "./PlatformIcon";

const STYLES: Record<Platform, string> = {
  steam: "bg-steam",
  epic: "bg-epic",
  ps5: "bg-ps5",
};

const LABELS: Record<Platform, string> = {
  steam: "STEAM",
  epic: "EPIC",
  ps5: "PS5",
};

export function PlatformBadge({ platform }: { platform: Platform }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border border-white/8 px-2 py-1 backdrop-blur-md ${STYLES[platform]}`}
    >
      <PlatformIcon platform={platform} size={11} />
      <span className="text-[9px] font-bold tracking-[0.08em] text-white/90">{LABELS[platform]}</span>
    </span>
  );
}
