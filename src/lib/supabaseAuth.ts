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

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string,
): Promise<{ snapshot: Snapshot | null; needsEmailConfirm: boolean }> {
  const client = requireSupabase();
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: displayName.trim() },
      emailRedirectTo: window.location.origin,
    },
  });
  if (error) {
    throw error;
  }
  if (!data.session || !data.user) {
    return { snapshot: null, needsEmailConfirm: true };
  }
  return { snapshot: withUser(authUserFromSupabase(data.user)), needsEmailConfirm: false };
}

export async function signOutSupabase(): Promise<void> {
  if (!supabase) {
    return;
  }
  await supabase.auth.signOut();
}
