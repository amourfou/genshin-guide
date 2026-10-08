import { api } from "@/lib/api";

export interface AppUser {
  id: string;
  name: string;
}

/** Older builds kept the user here and trusted it without a password. */
const LEGACY_SESSION_KEY = "genshin-user";

export function clearLegacySession(): void {
  if (typeof window !== "undefined") localStorage.removeItem(LEGACY_SESSION_KEY);
}

export function legacySessionName(): string {
  if (typeof window === "undefined") return "";
  try {
    const parsed = JSON.parse(localStorage.getItem(LEGACY_SESSION_KEY) ?? "") as { name?: unknown };
    return typeof parsed?.name === "string" ? parsed.name : "";
  } catch {
    return "";
  }
}

export async function fetchSession(): Promise<{ user: AppUser | null; error?: string }> {
  const result = await api<{ user: AppUser | null }>("/api/session");
  if (result.ok) return { user: result.data.user };
  if (result.status === 401) return { user: null };
  return { user: null, error: result.error };
}

export type LoginResult =
  | { ok: true; user: AppUser; created: boolean }
  | { ok: false; error: string; needsSetup?: boolean };

export async function login(name: string, password: string, setup: boolean): Promise<LoginResult> {
  const result = await api<{ user: AppUser; created?: boolean }>("/api/session", {
    method: "POST",
    body: { name, password, setup },
  });
  if (result.ok) return { ok: true, user: result.data.user, created: Boolean(result.data.created) };
  return { ok: false, error: result.error, needsSetup: result.data?.needsSetup === true };
}

export async function logout(): Promise<void> {
  await api("/api/session", { method: "DELETE" });
}
