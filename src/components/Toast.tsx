interface ToastProps {
  message: string;
  tone: "info" | "error";
}

export function Toast({ message, tone }: ToastProps) {
  const toneClass =
    tone === "error"
      ? "border-red-400/30 bg-red-500/15 text-red-100"
      : "border-white/15 bg-white/10 text-white";

  return (
    <div
      className={`fixed bottom-6 left-1/2 z-50 max-w-lg -translate-x-1/2 rounded-2xl border px-4 py-3 text-sm shadow-2xl backdrop-blur-xl ${toneClass}`}
      role="status"
    >
      {message}
    </div>
  );
}
