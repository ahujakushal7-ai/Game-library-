import { useEffect, useMemo, useState } from "react";
import catalog from "./data/games.json";
import { AccountsPanel } from "./components/AccountsPanel";
import { GameGrid } from "./components/GameGrid";
import { GameList } from "./components/GameList";
import { LibraryConnectPrompt } from "./components/LibraryConnectPrompt";
import { Sidebar } from "./components/Sidebar";
import { SignInScreen } from "./components/SignInScreen";
import { Toast } from "./components/Toast";
import { TopBar } from "./components/TopBar";
import {
  confirmLibraryImport,
  disconnectAccount,
  dismissLibraryPrompt,
  epicBeginLogin,
  epicCompleteLogin,
  getSnapshot,
  googleLogin,
  psnBeginLogin,
  psnCompleteLogin,
  psnOpenNpssoPage,
  refreshConnected,
  signOut,
  steamLogin,
  steamOpenApiKeyPage,
  steamSaveApiKey,
} from "./lib/accounts";
import { filterAndSortGames } from "./lib/catalog";
import { launchGame } from "./lib/launch";
import {
  emptySnapshot,
  type Game,
  type LibraryNav,
  type PlatformFilter,
  type Snapshot,
  type SortMode,
  type ViewMode,
} from "./types/game";

const sampleGames = catalog as Game[];

function loadFavorites(): string[] {
  try {
    const raw = localStorage.getItem("vault-favorites");
    return raw ? (JSON.parse(raw) as string[]) : ["steam-bg3", "ps5-gow-ragnarok"];
  } catch {
    return [];
  }
}

export default function App() {
  const [snapshot, setSnapshot] = useState<Snapshot>(emptySnapshot());
  const [ready, setReady] = useState(false);
  const [showAccounts, setShowAccounts] = useState(false);
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState<PlatformFilter>("all");
  const [sort, setSort] = useState<SortMode>("recent");
  const [nav, setNav] = useState<LibraryNav>("all");
  const [genre, setGenre] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("grid");
  const [favorites, setFavorites] = useState<string[]>(loadFavorites);
  const [launchingId, setLaunchingId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: "info" | "error" } | null>(null);

  const user = snapshot.user ?? null;
  const connected =
    snapshot.steam.connected || snapshot.epic.connected || snapshot.psn.connected;
  const library = (connected ? snapshot.games : sampleGames).map((game) => ({
    ...game,
    favorite: favorites.includes(game.id),
    genre: game.genre ?? "Imported",
    installed: game.installed ?? false,
    playtimeHours: game.playtimeHours ?? 0,
  }));

  const visibleGames = useMemo(
    () => filterAndSortGames(library, query, platform, sort, nav, genre),
    [library, query, platform, sort, nav, genre],
  );

  useEffect(() => {
    localStorage.setItem("vault-favorites", JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    getSnapshot()
      .then((next) => {
        setSnapshot(next);
        setReady(true);
      })
      .catch(() => setReady(true));
  }, []);

  function notify(message: string, tone: "info" | "error" = "info") {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 4200);
  }

  async function run(platformKey: string, work: () => Promise<Snapshot | void>) {
    setBusy(platformKey);
    try {
      const next = await work();
      if (next) {
        setSnapshot(next);
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : "Something went wrong.", "error");
    } finally {
      setBusy(null);
    }
  }

  async function onPlay(game: Game) {
    setLaunchingId(game.id);
    try {
      notify(await launchGame(game));
    } catch (error) {
      notify(error instanceof Error ? error.message : "Launch failed.", "error");
    } finally {
      setLaunchingId(null);
    }
  }

  function onFavorite(game: Game) {
    setFavorites((current) =>
      current.includes(game.id)
        ? current.filter((id) => id !== game.id)
        : [...current, game.id],
    );
  }

  if (!ready) {
    return <div className="min-h-screen bg-[#0a0912]" />;
  }

  if (!user) {
    return (
      <>
        <SignInScreen
          busy={busy}
          onGoogle={(clientId) =>
            run("google", async () => {
              notify("Complete Google sign-in in your browser...");
              const next = await googleLogin(clientId);
              notify(`Signed in as ${next.user?.displayName ?? "Google"}`);
              return next;
            })
          }
          onEpicStart={() =>
            run("epic", async () => {
              await epicBeginLogin();
              notify("Sign in with Epic, then paste authorizationCode.");
            })
          }
          onEpicComplete={(code) =>
            run("epic", async () => {
              const next = await epicCompleteLogin(code);
              notify(`Signed in with Epic as ${next.user?.displayName ?? "Epic"}`);
              return next;
            })
          }
          onPsnStart={() =>
            run("psn", async () => {
              await psnBeginLogin();
              notify("Sign in on PlayStation.com, then paste your NPSSO token.");
            })
          }
          onPsnNpssoPage={() =>
            psnOpenNpssoPage().catch((error: unknown) =>
              notify(error instanceof Error ? error.message : "Could not open NPSSO page.", "error"),
            )
          }
          onPsnComplete={(token) =>
            run("psn", async () => {
              const next = await psnCompleteLogin(token);
              notify(`Signed in with PlayStation as ${next.user?.displayName ?? "PSN"}`);
              return next;
            })
          }
        />
        {toast ? <Toast message={toast.message} tone={toast.tone} /> : null}
      </>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0a0912] text-[#f4f1ff]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(124,92,255,0.16),_transparent_34%),radial-gradient(circle_at_80%_0%,_rgba(79,125,255,0.12),_transparent_28%)]" />
      <Sidebar
        nav={nav}
        genre={genre}
        snapshot={snapshot}
        user={user}
        onNavChange={setNav}
        onGenreChange={setGenre}
        onOpenAccounts={() => setShowAccounts(true)}
        onSignOut={() =>
          run("auth", async () => {
            const next = await signOut();
            notify("Signed out.");
            return next;
          })
        }
      />

      <div className="relative flex min-w-0 flex-1 flex-col">
        <TopBar
          games={library}
          query={query}
          platform={platform}
          sort={sort}
          view={view}
          onQueryChange={setQuery}
          onPlatformChange={setPlatform}
          onSortChange={setSort}
          onViewChange={setView}
        />

        <main className="flex-1 overflow-auto px-6 py-5">
          {showAccounts ? (
            <div className="mb-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-[Syne] text-lg font-bold">Accounts</h2>
                <button
                  type="button"
                  onClick={() => setShowAccounts(false)}
                  className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.14em] text-[#b7b3c9]"
                >
                  Close
                </button>
              </div>
              <AccountsPanel
                snapshot={snapshot}
                busy={busy}
                onSteamLogin={() =>
                  run("steam", async () => {
                    notify("Complete Steam sign-in in your browser...");
                    const next = await steamLogin();
                    notify(`Steam connected${next.steam.label ? ` as ${next.steam.label}` : ""}.`);
                    return next;
                  })
                }
                onSteamApiKey={(key) =>
                  run("steam", async () => {
                    const next = await steamSaveApiKey(key);
                    notify(`Imported ${next.steam.gameCount} Steam titles.`);
                    return next;
                  })
                }
                onOpenSteamApiKey={() =>
                  steamOpenApiKeyPage().catch((error: unknown) =>
                    notify(error instanceof Error ? error.message : "Could not open API key page.", "error"),
                  )
                }
                onEpicLogin={() =>
                  run("epic", async () => {
                    await epicBeginLogin();
                    notify("Sign in with Epic, then paste authorizationCode below.");
                  })
                }
                onEpicCode={(code) =>
                  run("epic", async () => {
                    const next = await epicCompleteLogin(code);
                    notify(`Epic connected as ${next.epic.label || "Epic"}.`);
                    return next;
                  })
                }
                onPsnLogin={() =>
                  run("psn", async () => {
                    await psnBeginLogin();
                    notify("Sign in on PlayStation.com, then open NPSSO and paste the token.");
                  })
                }
                onPsnNpssoPage={() =>
                  psnOpenNpssoPage().catch((error: unknown) =>
                    notify(error instanceof Error ? error.message : "Could not open NPSSO page.", "error"),
                  )
                }
                onPsnToken={(token) =>
                  run("psn", async () => {
                    const next = await psnCompleteLogin(token);
                    notify(`PlayStation connected as ${next.psn.label || "PSN"}.`);
                    return next;
                  })
                }
                onDisconnect={(account) =>
                  run(account === "ps5" ? "psn" : account, async () => {
                    const next = await disconnectAccount(account);
                    notify("Account disconnected.");
                    return next;
                  })
                }
                onRefresh={() =>
                  run("refresh", async () => {
                    const next = await refreshConnected();
                    notify("Connected libraries refreshed.");
                    return next;
                  })
                }
              />
            </div>
          ) : null}

          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8b88a0]">
                {nav === "all" ? "All games" : nav}
              </p>
              <h1 className="font-[Syne] text-2xl font-extrabold">Your shelf</h1>
            </div>
            <p className="text-xs uppercase tracking-[0.16em] text-[#8b88a0]">
              {visibleGames.length} {visibleGames.length === 1 ? "title" : "titles"}
            </p>
          </div>

          {view === "grid" ? (
            <GameGrid
              games={visibleGames}
              launchingId={launchingId}
              onPlay={onPlay}
              onFavorite={onFavorite}
            />
          ) : (
            <GameList
              games={visibleGames}
              launchingId={launchingId}
              onPlay={onPlay}
              onFavorite={onFavorite}
            />
          )}
        </main>
      </div>

      {snapshot.pendingLibraryPrompt ? (
        <LibraryConnectPrompt
          provider={snapshot.pendingLibraryPrompt}
          busy={busy === "import"}
          onConnect={(provider) =>
            run("import", async () => {
              const next = await confirmLibraryImport(provider);
              notify("Library connected.");
              return next;
            })
          }
          onSkip={() =>
            run("import", async () => dismissLibraryPrompt(snapshot.pendingLibraryPrompt || "google"))
          }
          onChooseEpic={() =>
            run("import", async () => {
              const next = await dismissLibraryPrompt("google");
              setShowAccounts(true);
              await epicBeginLogin();
              notify("Sign in with Epic, then paste authorizationCode to connect that library.");
              return next;
            })
          }
          onChoosePsn={() =>
            run("import", async () => {
              const next = await dismissLibraryPrompt("google");
              setShowAccounts(true);
              await psnBeginLogin();
              notify("Sign in with PlayStation, then paste NPSSO to connect that library.");
              return next;
            })
          }
        />
      ) : null}

      {toast ? <Toast message={toast.message} tone={toast.tone} /> : null}
    </div>
  );
}
