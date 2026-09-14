import { useState } from "react";

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
    <div className="flex min-h-screen items-center justify-center bg-[#0a0912] px-6 text-[#f4f1ff]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(124,92,255,0.2),_transparent_34%),radial-gradient(circle_at_90%_10%,_rgba(79,125,255,0.14),_transparent_30%)]" />
      <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[#110f1c] p-8 shadow-2xl">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4f7dff] to-[#7c5cff] font-[Syne] text-xl font-extrabold">
            ⌂
          </div>
          <div>
            <p className="font-[Syne] text-2xl font-extrabold">VAULT</p>
            <p className="text-xs uppercase tracking-[0.22em] text-[#8b88a0]">Sign in to continue</p>
          </div>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => onGoogle(googleId)}
            className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-zinc-900 disabled:opacity-60"
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
            className="w-full rounded-2xl bg-zinc-800 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
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
            className="w-full rounded-2xl bg-[#0070D1] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
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
              className="mt-3 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs outline-none"
            />

        {panel === "epic" ? (
          <form
            className="mt-5 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              onEpicComplete(epicCode);
            }}
          >
            <p className="text-xs text-[#b7b3c9]">
              After Epic sign-in, copy <code>authorizationCode</code> from the JSON page and paste it here.
            </p>
            <input
              value={epicCode}
              onChange={(event) => setEpicCode(event.target.value)}
              placeholder="authorizationCode"
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none"
            />
            <button type="submit" className="w-full rounded-xl bg-[#7c5cff] px-3 py-2 text-sm font-semibold">
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
            <p className="text-xs text-[#b7b3c9]">
              Sign in on PlayStation.com, open the NPSSO page, then paste the token.
            </p>
            <input
              value={npsso}
              onChange={(event) => setNpsso(event.target.value)}
              placeholder="NPSSO token"
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none"
            />
            <div className="flex gap-2">
              <button type="submit" className="flex-1 rounded-xl bg-[#7c5cff] px-3 py-2 text-sm font-semibold">
                {busy === "psn" ? "Connecting..." : "Finish PlayStation sign-in"}
              </button>
              <button
                type="button"
                onClick={onPsnNpssoPage}
                className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
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
