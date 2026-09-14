import { useEffect, useMemo, useState } from "react";
import catalog from "./data/games.json";
import { AccountsPanel } from "./components/AccountsPanel";
import { GameGrid } from "./components/GameGrid";
import { LibraryControls } from "./components/LibraryControls";
import { Toast } from "./components/Toast";
import {
  disconnectAccount,
  epicBeginLogin,
  epicCompleteLogin,
  getSnapshot,
  psnBeginLogin,
  psnCompleteLogin,
  psnOpenNpssoPage,
  refreshConnected,
  steamLogin,
  steamOpenApiKeyPage,
  steamSaveApiKey,
} from "./lib/accounts";
import { filterAndSortGames } from "./lib/catalog";
import { launchGame } from "./lib/launch";
import { emptySnapshot, type Game, type PlatformFilter, type Snapshot, type SortMode } from "./types/game";

const sampleGames = catalog as Game[];

export default function App() {
  const [snapshot, setSnapshot] = useState<Snapshot>(emptySnapshot());
  const [showAccounts, setShowAccounts] = useState(true);
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState<PlatformFilter>("all");
  const [sort, setSort] = useState<SortMode>("az");
  const [launchingId, setLaunchingId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: "info" | "error" } | null>(null);

  const connected =
    snapshot.steam.connected || snapshot.epic.connected || snapshot.psn.connected;
  const games = connected ? snapshot.games : sampleGames;
  const visibleGames = useMemo(
    () => filterAndSortGames(games, query, platform, sort),
    [games, query, platform, sort],
  );

  useEffect(() => {
    getSnapshot()
      .then((next) => {
        setSnapshot(next);
      })
      .catch(() => undefined);
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

  return (
    <div className="min-h-screen bg-[#0D1117] text-zinc-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,_rgba(0,112,209,0.16),_transparent_42%),radial-gradient(circle_at_80%_20%,_rgba(102,192,244,0.12),_transparent_30%)]" />

      <main className="relative mx-auto max-w-7xl px-6 py-8">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">
              Windows game launcher
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Game Library</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-400">
              Sign in with Steam, Epic Games, and PlayStation to import your own catalogs. Play
              launches the native store app or PS Remote Play.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowAccounts((value) => !value)}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em]"
            >
              {showAccounts ? "Hide accounts" : "Accounts"}
            </button>
          </div>
        </header>

        {showAccounts ? (
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
                notify(`Imported ${next.epic.gameCount} Epic titles.`);
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
                notify(`Imported ${next.psn.gameCount} PlayStation titles.`);
                return next;
              })
            }
            onDisconnect={(platform) =>
              run(platform === "ps5" ? "psn" : platform, async () => {
                const next = await disconnectAccount(platform);
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
        ) : null}

        <LibraryControls
          query={query}
          platform={platform}
          sort={sort}
          onQueryChange={setQuery}
          onPlatformChange={setPlatform}
          onSortChange={setSort}
        />

        <p className="mt-5 mb-4 text-xs uppercase tracking-[0.18em] text-zinc-500">
          {visibleGames.length} {visibleGames.length === 1 ? "title" : "titles"}
          {connected ? " · imported from your accounts" : " · sample catalog until you sign in"}
        </p>

        <GameGrid games={visibleGames} launchingId={launchingId} onPlay={onPlay} />
      </main>

      {toast ? <Toast message={toast.message} tone={toast.tone} /> : null}
    </div>
  );
}
