import { useState } from "react";
import { AuthLayout, fieldClass, primaryButtonClass } from "./AuthLayout";

interface SignupPageProps {
  busy: string | null;
  onSignup: (name: string, email: string, password: string) => void;
  onOpenLogin: () => void;
}

export function SignupPage({ busy, onSignup, onOpenLogin }: SignupPageProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [mismatch, setMismatch] = useState(false);

  return (
    <AuthLayout heading="Create your account">
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (password !== confirm) {
            setMismatch(true);
            return;
          }
          setMismatch(false);
          onSignup(name.trim(), email.trim(), password);
        }}
      >
        <input
          type="text"
          autoComplete="name"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Display name"
          className={fieldClass}
        />
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
          autoComplete="new-password"
          required
          minLength={6}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password (min 6 characters)"
          className={fieldClass}
        />
        <input
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          placeholder="Confirm password"
          className={fieldClass}
        />
        {mismatch ? <p className="text-xs text-red-400">Passwords do not match.</p> : null}
        <button type="submit" disabled={busy !== null} className={primaryButtonClass}>
          {busy === "signup" ? "Creating account..." : "Sign up"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-ink-2">
        Already have an account?{" "}
        <button type="button" onClick={onOpenLogin} className="font-semibold text-accent-soft">
          Log in
        </button>
      </p>
    </AuthLayout>
  );
}
