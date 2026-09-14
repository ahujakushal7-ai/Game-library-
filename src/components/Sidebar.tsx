import type { ReactNode } from "react";
import type { AuthUser, LibraryNav, Snapshot } from "../types/game";
import { GENRES } from "../lib/catalog";
import { PlatformIcon, VaultMark } from "./PlatformIcon";

interface SidebarProps {
  nav: LibraryNav;
  genre: string | null;
  snapshot: Snapshot;
  user: AuthUser | null;
  onNavChange: (nav: LibraryNav) => void;
  onGenreChange: (genre: string | null) => void;
  onOpenAccounts: () => void;
  onSignOut: () => void;
}

const NAV: { id: LibraryNav; label: string; icon: ReactNode }[] = [
  {
    id: "all",
    label: "All Games",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.9" />
        <rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.9" />
        <rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.9" />
        <rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.9" />
      </svg>
    ),
  },
  {
    id: "installed",
    label: "Installed",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path
          d="M8 2v8M5 7l3 3 3-3M3 13h10"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: "favorites",
    label: "Favorites",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 13.5S2 9.5 2 5.5A3 3 0 0 1 8 3.9 3 3 0 0 1 14 5.5c0 4-6 8-6 8z" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "recent",
    label: "Recent",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M8 5v3.5l2.5 1.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

export function Sidebar({
  nav,
  genre,
  snapshot,
  user,
  onNavChange,
  onGenreChange,
  onOpenAccounts,
  onSignOut,
}: SidebarProps) {
  const services = [
    { id: "steam" as const, name: "Steam", connected: snapshot.steam.connected, count: snapshot.steam.gameCount },
    { id: "epic" as const, name: "Epic", connected: snapshot.epic.connected, count: snapshot.epic.gameCount },
    { id: "ps5" as const, name: "PlayStation 5", connected: snapshot.psn.connected, count: snapshot.psn.gameCount },
  ];

  return (
    <aside className="flex h-screen w-[260px] shrink-0 flex-col overflow-hidden border-r border-surface-raised bg-sidebar">
      <div className="flex items-center gap-3 border-b border-surface-raised px-5 py-5">
        <div className="flex h-[34px] w-[34px] items-center justify-center rounded-lg bg-linear-to-br from-accent to-[#0070D1]">
          <VaultMark />
        </div>
        <div>
          <p className="text-[13px] font-bold tracking-[0.02em] text-ink">VAULT</p>
          <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-ink-3">Game Library</p>
        </div>
      </div>

      <div className="border-b border-surface-raised px-4 py-4">
        <div className="flex items-center gap-3 rounded-xl bg-surface px-2 py-2.5">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-accent to-[#0070D1] text-[13px] font-bold text-white">
              {user?.initials || "U"}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-ink">{user?.displayName || "Player"}</p>
            <p className="flex items-center gap-1.5 text-[11px] text-ink-3">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Online
            </p>
          </div>
          <button
            type="button"
            onClick={onSignOut}
            className="ml-auto rounded-full bg-accent/12 px-[7px] py-0.5 text-[10px] font-semibold text-accent"
          >
            Sign out
          </button>
        </div>
      </div>

      <nav className="px-3 py-3">
        <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-3">Library</p>
        {NAV.map((item) => {
          const active = nav === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavChange(item.id)}
              className={`mb-0.5 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] transition-all duration-150 ${
                active
                  ? "border border-accent/25 bg-accent/15 font-semibold text-accent-soft"
                  : "border border-transparent font-normal text-ink-2 hover:bg-white/4 hover:text-[#C8D0E0]"
              }`}
            >
              <span className={active ? "opacity-100" : "opacity-70"}>{item.icon}</span>
              {item.label}
              {active ? <span className="ml-auto h-[5px] w-[5px] rounded-full bg-accent" /> : null}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-surface-raised px-3 py-2">
        <p className="px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-3">Tags</p>
        <div className="flex flex-wrap gap-1.5 px-1">
          {GENRES.map((item) => {
            const active = genre === item;
            return (
              <button
                key={item}
                type="button"
                onClick={() => onGenreChange(active ? null : item)}
                className={`rounded-full px-[9px] py-[3px] text-[11px] font-medium ${
                  active
                    ? "border border-accent/50 bg-accent/18 text-accent-soft"
                    : "border border-line bg-transparent text-[#5A647A] hover:border-accent/30"
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-auto border-t border-surface-raised px-3 pb-5 pt-3">
        <div className="mb-2.5 flex items-center justify-between px-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-3">Connected Services</p>
          <button type="button" onClick={onOpenAccounts} className="text-[11px] font-semibold text-accent-soft">
            Manage
          </button>
        </div>
        <div className="flex flex-col gap-2 px-1">
          {services.map((service) => (
            <div
              key={service.name}
              className="flex items-center gap-3 rounded-xl border border-line-subtle bg-surface px-3 py-2.5"
            >
              <PlatformIcon platform={service.id} size={18} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-[#C8D0E0]">{service.name}</p>
                <p className="text-[10px] text-ink-3">{service.connected ? `${service.count} games` : "Not linked"}</p>
              </div>
              {service.connected ? (
                <span className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_4px_#22C55E]" />
                  Active
                </span>
              ) : (
                <span className="text-[10px] text-ink-3">Off</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
