import type { AuthUser, LibraryNav, Snapshot } from "../types/game";
import { GENRES } from "../lib/catalog";

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

const NAV: { id: LibraryNav; label: string }[] = [
  { id: "all", label: "All Games" },
  { id: "installed", label: "Installed" },
  { id: "favorites", label: "Favorites" },
  { id: "recent", label: "Recent" },
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
    { name: "Steam", connected: snapshot.steam.connected, count: snapshot.steam.gameCount, color: "#66c0f4" },
    { name: "Epic", connected: snapshot.epic.connected, count: snapshot.epic.gameCount, color: "#d4d4d8" },
    { name: "PS5", connected: snapshot.psn.connected, count: snapshot.psn.gameCount, color: "#0070D1" },
  ];

  return (
    <aside className="flex h-screen w-[260px] shrink-0 flex-col overflow-y-auto border-r border-white/8 bg-[#110f1c] px-4 py-5">
      <div className="mb-6 flex items-center gap-3 px-1">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#4f7dff] to-[#7c5cff] font-[Syne] text-lg font-extrabold">
          ⌂
        </div>
        <div>
          <p className="font-[Syne] text-lg font-extrabold tracking-wide">VAULT</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8b88a0]">
            Game Library
          </p>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-white/8 bg-white/5 p-3">
        <div className="flex items-center gap-3">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#7c5cff] to-[#4f7dff] text-sm font-bold">
              {user?.initials || "U"}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{user?.displayName || "Player"}</p>
            <p className="flex items-center gap-1 text-xs text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {user?.provider ? user.provider.toUpperCase() : "Online"}
            </p>
          </div>
          <button
            type="button"
            onClick={onSignOut}
            className="rounded-full bg-[#7c5cff]/20 px-2 py-1 text-[10px] font-bold tracking-wide text-[#cbbdff]"
          >
            Sign out
          </button>
        </div>
      </div>

      <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8b88a0]">
        Library
      </p>
      <nav className="mb-6 flex flex-col gap-1">
        {NAV.map((item) => {
          const active = nav === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavChange(item.id)}
              className={`rounded-xl px-3 py-2.5 text-left text-sm font-medium ${
                active
                  ? "bg-[#7c5cff]/25 text-white"
                  : "text-[#b7b3c9] hover:bg-white/5 hover:text-white"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8b88a0]">
        Genres
      </p>
      <div className="mb-6 flex flex-wrap gap-2">
        {GENRES.map((item) => {
          const active = genre === item;
          return (
            <button
              key={item}
              type="button"
              onClick={() => onGenreChange(active ? null : item)}
              className={`rounded-full px-2.5 py-1 text-[11px] ${
                active ? "bg-[#7c5cff] text-white" : "bg-white/8 text-[#cfcbe0] hover:bg-white/12"
              }`}
            >
              {item}
            </button>
          );
        })}
      </div>

      <div className="mt-auto rounded-2xl border border-white/8 bg-white/5 p-3">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8b88a0]">
            Connected
          </p>
          <button
            type="button"
            onClick={onOpenAccounts}
            className="text-[11px] font-semibold text-[#cbbdff]"
          >
            Manage
          </button>
        </div>
        <div className="space-y-2">
          {services.map((service) => (
            <div key={service.name} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: service.connected ? service.color : "#4b465f" }}
                />
                {service.name}
              </span>
              <span className="text-[#8b88a0]">
                {service.connected ? `${service.count}` : "Off"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
