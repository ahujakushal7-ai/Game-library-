import type { ReactNode } from "react";
import { VaultMark } from "./PlatformIcon";

interface AuthLayoutProps {
  heading: string;
  children: ReactNode;
}

export function AuthLayout({ heading, children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-6 text-ink">
      <div className="relative w-full max-w-md rounded-3xl border border-line bg-sidebar p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-accent to-[#0070D1]">
            <VaultMark size={22} />
          </div>
          <div>
            <p className="text-2xl font-bold tracking-[0.02em]">VAULT</p>
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-ink-3">{heading}</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

export const fieldClass =
  "w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none placeholder:text-ink-3 focus:border-accent/50";

export const primaryButtonClass =
  "w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white disabled:opacity-60";
