import { useState } from "react";
import { VaultMark } from "./PlatformIcon";

interface SignInScreenProps {
  busy: string | null;
  onGoogle: (clientId: string) => void;
  onEpicStart: () => void;
  onEpicComplete: (code: string) => void;
  onPsnStart: () => void;
  onPsnNpssoPage: () => void;
  onPsnComplete: (token: string) => void;
}

export function SignInScreen({
  busy,
  onGoogle,
  onEpicStart,
  onEpicComplete,
  onPsnStart,
  onPsnNpssoPage,
  onPsnComplete,
}: SignInScreenProps) {
  const [panel, setPanel] = useState<"google" | "epic" | "psn" | null>(null);
  const [googleId, setGoogleId] = useState(localStorage.getItem("vault-google-client-id") ?? "");
  const [epicCode, setEpicCode] = useState("");
  const [npsso, setNpsso] = useState("");

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-6 text-ink">
      <div className="relative w-full max-w-md rounded-3xl border border-line bg-sidebar p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-accent to-[#0070D1]">
            <VaultMark size={22} />
          </div>
          <div>
            <p className="text-2xl font-bold tracking-[0.02em]">VAULT</p>
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-ink-3">Sign in to continue</p>
          </div>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => onGoogle(googleId)}
            className="w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-zinc-900 disabled:opacity-60"
          >
            {busy === "google" ? "Waiting for Google..." : "Continue with Google"}
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => {
              setPanel("epic");
              onEpicStart();
            }}
            className="w-full rounded-xl bg-epic px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            Continue with Epic Games
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => {
              setPanel("psn");
              onPsnStart();
            }}
            className="w-full rounded-xl bg-[#0070D1] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            Continue with PlayStation
          </button>
        </div>

        <input
          value={googleId}
          onChange={(event) => {
            setGoogleId(event.target.value);
            localStorage.setItem("vault-google-client-id", event.target.value.trim());
          }}
          placeholder="Google client ID (desktop OAuth, optional for preview)"
          className="mt-3 w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink outline-none"
        />

        {panel === "epic" ? (
          <form
            className="mt-5 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              onEpicComplete(epicCode);
            }}
          >
            <p className="text-xs text-ink-2">
              After Epic sign-in, copy <code>authorizationCode</code> from the JSON page and paste it here.
            </p>
            <input
              value={epicCode}
              onChange={(event) => setEpicCode(event.target.value)}
              placeholder="authorizationCode"
              className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none"
            />
            <button
              type="submit"
              className="w-full rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-white"
            >
              {busy === "epic" ? "Connecting..." : "Finish Epic sign-in"}
            </button>
          </form>
        ) : null}

        {panel === "psn" ? (
          <form
            className="mt-5 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              onPsnComplete(npsso);
            }}
          >
            <p className="text-xs text-ink-2">
              Sign in on PlayStation.com, open the NPSSO page, then paste the token.
            </p>
            <input
              value={npsso}
              onChange={(event) => setNpsso(event.target.value)}
              placeholder="NPSSO token"
              className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none"
            />
            <div className="flex gap-2">
              <button type="submit" className="flex-1 rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-white">
                {busy === "psn" ? "Connecting..." : "Finish PlayStation sign-in"}
              </button>
              <button
                type="button"
                onClick={onPsnNpssoPage}
                className="rounded-xl border border-line px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink-2"
              >
                Open NPSSO
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
}
