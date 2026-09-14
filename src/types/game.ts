export type Platform = "steam" | "epic" | "ps5";

export interface Game {
  id: string;
  title: string;
  platform: Platform;
  coverUrl: string;
  lastPlayed: string | null;
  steamAppId?: string;
  epicAppName?: string;
  launchUri?: string;
}

export type PlatformFilter = "all" | Platform;
export type SortMode = "az" | "recent";
