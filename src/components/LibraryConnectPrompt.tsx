interface LibraryConnectPromptProps {
  provider: string;
  busy: boolean;
  onConnect: (provider: string) => void;
  onSkip: () => void;
  onChooseEpic: () => void;
  onChoosePsn: () => void;
}

export function LibraryConnectPrompt({
  provider,
  busy,
  onConnect,
  onSkip,
  onChooseEpic,
  onChoosePsn,
}: LibraryConnectPromptProps) {
  const isGoogle = provider === "google";
  const title =
    provider === "epic"
      ? "Connect your Epic library?"
      : provider === "psn"
        ? "Connect your PlayStation library?"
        : provider === "steam"
          ? "Connect your Steam library?"
          : "Connect a game library?";
  const body =
    provider === "epic"
      ? "This is your first Epic sign-in. Import owned Epic games into VAULT now?"
      : provider === "psn"
        ? "This is your first PlayStation sign-in. Import your PSN titles into VAULT now?"
        : provider === "steam"
          ? "Steam signed you in. Import your full Steam library now, including games that are not installed on this PC?"
          : "Google signed you in. Connect Epic or PlayStation to import your real game shelf.";

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md rounded-3xl border border-line bg-surface p-6 shadow-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-3">
          First-time connection
        </p>
        <h2 className="mt-2 text-2xl font-bold">{title}</h2>
        <p className="mt-3 text-sm text-ink-2">{body}</p>

        {isGoogle ? (
          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={onChooseEpic}
              className="rounded-xl bg-zinc-800 px-4 py-3 text-sm font-semibold"
            >
              Connect Epic Games
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onChoosePsn}
              className="rounded-xl bg-[#0070D1] px-4 py-3 text-sm font-semibold"
            >
              Connect PlayStation
            </button>
            <button type="button" onClick={onSkip} className="px-4 py-2 text-sm text-[#8b88a0]">
              Later
            </button>
          </div>
        ) : (
          <div className="mt-6 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => onConnect(provider)}
              className="flex-1 rounded-xl bg-accent px-4 py-3 text-sm font-semibold disabled:opacity-60"
            >
              {busy ? "Importing..." : "Connect library"}
            </button>
            <button
              type="button"
              onClick={onSkip}
              className="rounded-xl border border-white/10 px-4 py-3 text-sm text-[#b7b3c9]"
            >
              Not now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
