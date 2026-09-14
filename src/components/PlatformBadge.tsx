import type { Platform } from "../types/game";
import { PLATFORM_LABEL } from "../lib/catalog";

const STYLES: Record<Platform, string> = {
  steam:
    "bg-[#1b2838]/90 text-[#66c0f4] border-[#66c0f4]/40 shadow-[0_0_16px_rgba(102,192,244,0.25)]",
  epic: "bg-white/10 text-zinc-100 border-white/30",
  ps5: "bg-[#0070D1]/20 text-[#7ec4ff] border-[#0070D1]/50 shadow-[0_0_16px_rgba(0,112,209,0.28)]",
};

export function PlatformBadge({ platform }: { platform: Platform }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] backdrop-blur-md ${STYLES[platform]}`}
    >
      {PLATFORM_LABEL[platform]}
    </span>
  );
}
