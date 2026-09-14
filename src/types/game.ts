export type Platform = "steam" | "epic" | "ps5";
export type PlatformFilter = "all" | Platform;
export type SortMode = "az" | "recent" | "playtime";
export type LibraryNav = "all" | "installed" | "favorites" | "recent";
export type ViewMode = "grid" | "list";

export interface Game {
  id: string;
  title: string;
  platform: Platform;
  coverUrl: string;
  lastPlayed: string | null;
  steamAppId?: string;
  epicAppName?: string;
  launchUri?: string;
  genre?: string;
  installed?: boolean;
  favorite?: boolean;
  playtimeHours?: number;
  rating?: number | null;
  trophies?: string;
}

export interface AccountStatus {
  connected: boolean;
  label: string;
  gameCount: number;
  needsAction?: string | null;
}

export interface AuthUser {
  provider: "google" | "epic" | "psn" | "steam" | "email";
  displayName: string;
  email?: string | null;
  avatarUrl?: string | null;
  initials: string;
}

export interface Snapshot {
  steam: AccountStatus;
  epic: AccountStatus;
  psn: AccountStatus;
  games: Game[];
  user?: AuthUser | null;
  pendingLibraryPrompt?: string | null;
}

export function emptySnapshot(): Snapshot {
  return {
    steam: { connected: false, label: "", gameCount: 0, needsAction: null },
    epic: { connected: false, label: "", gameCount: 0, needsAction: null },
    psn: { connected: false, label: "", gameCount: 0, needsAction: null },
    games: [],
    user: null,
    pendingLibraryPrompt: null,
  };
}
