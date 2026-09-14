import type { Platform } from "../types/game";
import { PLATFORM_LABEL } from "../lib/catalog";

const STYLES: Record<Platform, string> = {
  steam: "bg-[#1b2838]/90 text-[#9ecbff] border-[#66c0f4]/30",
  epic: "bg-black/70 text-zinc-100 border-white/20",
  ps5: "bg-[#0070D1]/85 text-white border-[#4ea2ff]/40",
};

export function PlatformBadge({ platform }: { platform: Platform }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] backdrop-blur-md ${STYLES[platform]}`}
    >
      {platform === "ps5" ? "PS5" : PLATFORM_LABEL[platform]}
    </span>
  );
}
