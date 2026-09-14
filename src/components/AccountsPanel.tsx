import { useState, type ReactNode } from "react";
import type { AccountStatus, Snapshot } from "../types/game";

interface AccountsPanelProps {
  snapshot: Snapshot;
  busy: string | null;
  onSteamLogin: () => void;
  onSteamApiKey: (key: string) => void;
  onOpenSteamApiKey: () => void;
  onEpicLogin: () => void;
  onEpicCode: (code: string) => void;
  onPsnLogin: () => void;
  onPsnNpssoPage: () => void;
  onPsnToken: (token: string) => void;
  onDisconnect: (platform: "steam" | "epic" | "ps5") => void;
  onRefresh: () => void;
}

export function AccountsPanel(props: AccountsPanelProps) {
  const [steamKey, setSteamKey] = useState("");
  const [epicCode, setEpicCode] = useState("");
  const [npsso, setNpsso] = useState("");

  return (
    <section className="mb-2 grid gap-4 lg:grid-cols-3">
      <AccountCard
        title="Steam"
        description="Sign in with Steam OpenID, then add your own Web API key to import the full owned library."
        status={props.snapshot.steam}
        busy={props.busy === "steam"}
        onConnect={props.onSteamLogin}
        onDisconnect={() => props.onDisconnect("steam")}
        extra={
          props.snapshot.steam.connected ? (
            <form
              className="mt-3 flex flex-col gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                props.onSteamApiKey(steamKey);
              }}
            >
              <input
                value={steamKey}
                onChange={(event) => setSteamKey(event.target.value)}
                placeholder="Steam Web API key"
                className="rounded-xl border border-line bg-canvas px-3 py-2 text-sm outline-none"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="rounded-xl bg-[#66c0f4]/20 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#66c0f4]"
                >
                  Import library
                </button>
                <button
                  type="button"
                  onClick={props.onOpenSteamApiKey}
                  className="rounded-xl border border-line px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-300"
                >
                  Get API key
                </button>
              </div>
            </form>
          ) : null
        }
      />

      <AccountCard
        title="Epic Games"
        description="Sign in on Epic’s site. After login, copy authorizationCode from the JSON page and paste it here."
        status={props.snapshot.epic}
        busy={props.busy === "epic"}
        onConnect={props.onEpicLogin}
        onDisconnect={() => props.onDisconnect("epic")}
        extra={
          <form
            className="mt-3 flex flex-col gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              props.onEpicCode(epicCode);
            }}
          >
            <input
              value={epicCode}
              onChange={(event) => setEpicCode(event.target.value)}
              placeholder="authorizationCode"
              className="rounded-xl border border-line bg-canvas px-3 py-2 text-sm outline-none"
            />
            <button
              type="submit"
              className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em]"
            >
              Connect Epic library
            </button>
          </form>
        }
      />

      <AccountCard
        title="PlayStation"
        description="Sign in on PlayStation.com, open the NPSSO page, then paste the token to import your PSN titles."
        status={props.snapshot.psn}
        busy={props.busy === "psn"}
        onConnect={props.onPsnLogin}
        onDisconnect={() => props.onDisconnect("ps5")}
        extra={
          <form
            className="mt-3 flex flex-col gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              props.onPsnToken(npsso);
            }}
          >
            <input
              value={npsso}
              onChange={(event) => setNpsso(event.target.value)}
              placeholder="NPSSO token"
              className="rounded-xl border border-line bg-canvas px-3 py-2 text-sm outline-none"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded-xl bg-[#0070D1]/30 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#7ec4ff]"
              >
                Connect PSN
              </button>
              <button
                type="button"
                onClick={props.onPsnNpssoPage}
                className="rounded-xl border border-line px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-300"
              >
                Open NPSSO
              </button>
            </div>
          </form>
        }
      />

      <div className="lg:col-span-3 flex justify-end">
        <button
          type="button"
          onClick={props.onRefresh}
          disabled={props.busy !== null}
          className="rounded-full border border-line px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-300"
        >
          Refresh connected libraries
        </button>
      </div>
    </section>
  );
}

function AccountCard({
  title,
  description,
  status,
  busy,
  onConnect,
  onDisconnect,
  extra,
}: {
  title: string;
  description: string;
  status: AccountStatus;
  busy: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  extra?: ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <p className="mt-1 text-sm text-zinc-400">{description}</p>
        </div>
        <span
          className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
            status.connected ? "bg-emerald-400/15 text-emerald-300" : "bg-white/10 text-zinc-400"
          }`}
        >
          {busy ? "Working" : status.connected ? "Connected" : "Not linked"}
        </span>
      </div>

      {status.connected ? (
        <p className="mt-3 text-sm text-zinc-200">
          {status.label} · {status.gameCount} imported
        </p>
      ) : null}
      {status.needsAction ? (
        <p className="mt-2 text-xs text-amber-300">{status.needsAction}</p>
      ) : null}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onConnect}
          disabled={busy}
          className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] disabled:opacity-60"
        >
          {status.connected ? "Reconnect" : "Sign in"}
        </button>
        {status.connected ? (
          <button
            type="button"
            onClick={onDisconnect}
            className="rounded-xl border border-line px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400"
          >
            Disconnect
          </button>
        ) : null}
      </div>
      {extra}
    </article>
  );
}
