import { useEffect, useMemo, useState } from "react";
import catalog from "./data/games.json";
import { AccountsPanel } from "./components/AccountsPanel";
import { GameGrid } from "./components/GameGrid";
import { GameList } from "./components/GameList";
import { LibraryConnectPrompt } from "./components/LibraryConnectPrompt";
import { LoginPage } from "./components/LoginPage";
import { Sidebar } from "./components/Sidebar";
import { SignupPage } from "./components/SignupPage";
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
import { signInWithEmail, signUpWithEmail } from "./lib/supabaseAuth";
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
  const [authPage, setAuthPage] = useState<"login" | "signup">("login");

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
    return <div className="min-h-screen bg-canvas" />;
  }

  if (!user) {
    const providerProps = {
      busy,
      onGoogle: (clientId: string) =>
        run("google", async () => {
          notify("Complete Google sign-in in your browser...");
          const next = await googleLogin(clientId);
          notify(`Signed in as ${next.user?.displayName ?? "Google"}`);
          return next;
        }),
      onEpicStart: () =>
        run("epic", async () => {
          await epicBeginLogin();
          notify("Sign in with Epic, then paste authorizationCode.");
        }),
      onEpicComplete: (code: string) =>
        run("epic", async () => {
          const next = await epicCompleteLogin(code);
          notify(`Signed in with Epic as ${next.user?.displayName ?? "Epic"}`);
          return next;
        }),
      onPsnStart: () =>
        run("psn", async () => {
          await psnBeginLogin();
          notify("Sign in on PlayStation.com, then paste your NPSSO token.");
        }),
      onPsnNpssoPage: () =>
        psnOpenNpssoPage().catch((error: unknown) =>
          notify(error instanceof Error ? error.message : "Could not open NPSSO page.", "error"),
        ),
      onPsnComplete: (token: string) =>
        run("psn", async () => {
          const next = await psnCompleteLogin(token);
          notify(`Signed in with PlayStation as ${next.user?.displayName ?? "PSN"}`);
          return next;
        }),
    };

    return (
      <>
        {authPage === "signup" ? (
          <SignupPage
            busy={busy}
            onOpenLogin={() => setAuthPage("login")}
            onSignup={(name, email, password) =>
              run("signup", async () => {
                const result = await signUpWithEmail(email, password, name);
                if (result.needsEmailConfirm) {
                  notify("Check your email to confirm your account, then log in.");
                  setAuthPage("login");
                  return;
                }
                notify(`Welcome to VAULT, ${result.snapshot?.user?.displayName ?? name}`);
                return result.snapshot ?? undefined;
              })
            }
          />
        ) : (
          <LoginPage
            {...providerProps}
            onOpenSignup={() => setAuthPage("signup")}
            onEmailLogin={(email, password) =>
              run("email", async () => {
                const next = await signInWithEmail(email, password);
                notify(`Signed in as ${next.user?.displayName ?? email}`);
                return next;
              })
            }
          />
        )}
        {toast ? <Toast message={toast.message} tone={toast.tone} /> : null}
      </>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-canvas text-ink">
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

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar
          games={library}
          gameCount={visibleGames.length}
          query={query}
          platform={platform}
          sort={sort}
          view={view}
          onQueryChange={setQuery}
          onPlatformChange={setPlatform}
          onSortChange={setSort}
          onViewChange={setView}
        />

        <main className="scroll-show flex-1 overflow-auto px-6 py-6">
          {showAccounts ? (
            <div className="mb-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-bold text-ink">Accounts</h2>
                <button
                  type="button"
                  onClick={() => setShowAccounts(false)}
                  className="rounded-full border border-line px-3 py-1 text-xs uppercase tracking-[0.14em] text-ink-2"
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
