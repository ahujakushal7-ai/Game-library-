import type { User } from "@supabase/supabase-js";
import { emptySnapshot, type AuthUser, type Snapshot } from "../types/game";
import { requireSupabase, supabase } from "./supabase";

function initialsFor(name: string): string {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function authUserFromSupabase(user: User): AuthUser {
  const meta = user.user_metadata ?? {};
  const displayName =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    user.email?.split("@")[0] ||
    "Player";
  const avatarUrl =
    (typeof meta.avatar_url === "string" && meta.avatar_url) ||
    (typeof meta.picture === "string" && meta.picture) ||
    null;
  const provider = user.app_metadata?.provider === "google" ? "google" : "email";
  return {
    provider,
    displayName,
    email: user.email,
    avatarUrl,
    initials: initialsFor(displayName),
  };
}

function withUser(user: AuthUser): Snapshot {
  try {
    const raw = localStorage.getItem("vault-preview-snapshot");
    const current = raw
      ? ({ ...emptySnapshot(), ...(JSON.parse(raw) as Snapshot) } as Snapshot)
      : emptySnapshot();
    current.user = user;
    localStorage.setItem("vault-preview-snapshot", JSON.stringify(current));
    return current;
  } catch {
    return { ...emptySnapshot(), user };
  }
}

export async function restoreSupabaseUser(): Promise<AuthUser | null> {
  if (!supabase) {
    return null;
  }
  const { data } = await supabase.auth.getUser();
  return data.user ? authUserFromSupabase(data.user) : null;
}

export async function signInWithEmail(email: string, password: string): Promise<Snapshot> {
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    throw error;
  }
  if (!data.user) {
    throw new Error("Sign-in did not return a user.");
  }
  return withUser(authUserFromSupabase(data.user));
}

async function functionErrorMessage(error: { message: string; context?: Response }): Promise<string> {
  if (error.context) {
    try {
      const body = (await error.context.clone().json()) as { error?: string };
      if (body.error) {
        return body.error;
      }
    } catch {
      // Fall through to the default Functions error.
    }
  }
  if (/rate limit/i.test(error.message)) {
    return "Too many signup emails were sent. Try again in about an hour, or use Log in if you already have an account.";
  }
  return error.message;
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string,
): Promise<{ snapshot: Snapshot | null; needsEmailConfirm: boolean }> {
  const client = requireSupabase();
  const { data, error } = await client.functions.invoke("signup-email", {
    body: { email, password, displayName: displayName.trim() },
  });
  if (error) {
    throw new Error(await functionErrorMessage(error));
  }
  const payload = data as { error?: string; ok?: boolean } | null;
  if (payload?.error) {
    throw new Error(payload.error);
  }
  return { snapshot: await signInWithEmail(email, password), needsEmailConfirm: false };
}

export async function signOutSupabase(): Promise<void> {
  if (!supabase) {
    return;
  }
  await supabase.auth.signOut();
}
