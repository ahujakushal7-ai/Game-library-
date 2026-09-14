import { useState } from "react";
import { AuthLayout, fieldClass, primaryButtonClass } from "./AuthLayout";
import { AuthProviders } from "./AuthProviders";

interface LoginPageProps {
  busy: string | null;
  onEmailLogin: (email: string, password: string) => void;
  onOpenSignup: () => void;
  onGoogle: (clientId: string) => void;
  onSteam?: () => void;
  onEpicStart: () => void;
  onEpicComplete: (code: string) => void;
  onPsnStart: () => void;
  onPsnNpssoPage: () => void;
  onPsnComplete: (token: string) => void;
}

export function LoginPage({
  busy,
  onEmailLogin,
  onOpenSignup,
  onGoogle,
  onSteam,
  onEpicStart,
  onEpicComplete,
  onPsnStart,
  onPsnNpssoPage,
  onPsnComplete,
}: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <AuthLayout heading="Log in to continue">
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          onEmailLogin(email.trim(), password);
        }}
      >
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
          className={fieldClass}
        />
        <input
          type="password"
          autoComplete="current-password"
          required
          minLength={6}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          className={fieldClass}
        />
        <button type="submit" disabled={busy !== null} className={primaryButtonClass}>
          {busy === "email" ? "Signing in..." : "Log in"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-ink-2">
        New to VAULT?{" "}
        <button type="button" onClick={onOpenSignup} className="font-semibold text-accent-soft">
          Create an account
        </button>
      </p>

      <div className="my-6 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-3">
        <span className="h-px flex-1 bg-line" />
        Or continue with
        <span className="h-px flex-1 bg-line" />
      </div>

      <AuthProviders
        busy={busy}
        onGoogle={onGoogle}
        onSteam={onSteam}
        onEpicStart={onEpicStart}
        onEpicComplete={onEpicComplete}
        onPsnStart={onPsnStart}
        onPsnNpssoPage={onPsnNpssoPage}
        onPsnComplete={onPsnComplete}
      />
    </AuthLayout>
  );
}
