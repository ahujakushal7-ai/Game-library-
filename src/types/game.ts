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

export interface AccountStatus {
  connected: boolean;
  label: string;
  gameCount: number;
  needsAction?: string | null;
}

export interface Snapshot {
  steam: AccountStatus;
  epic: AccountStatus;
  psn: AccountStatus;
  games: Game[];
}

export function emptySnapshot(): Snapshot {
  return {
    steam: { connected: false, label: "", gameCount: 0, needsAction: null },
    epic: { connected: false, label: "", gameCount: 0, needsAction: null },
    psn: { connected: false, label: "", gameCount: 0, needsAction: null },
    games: [],
  };
}
