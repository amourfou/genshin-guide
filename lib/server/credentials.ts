import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { dbFailure } from "@/lib/server/db";

/**
 * Login secret lookup. Primary: shared public.user_pins (same PIN for all family apps).
 * Fallback: legacy public.genshin_logins, read-only except lockout counters, so existing
 * genshin passwords keep working until user_pins has a row for that user.
 */
export interface Credential {
  source: "user_pins" | "genshin_logins";
  userId: string;
  hash: string;
  failedCount: number;
  lockedUntil: string | null;
}

function missingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42P01" || error.code === "PGRST205" || /does not exist|schema cache/i.test(error.message ?? "");
}

export async function loadCredential(db: SupabaseClient, userId: string): Promise<Credential | null> {
  const pin = await db
    .from("user_pins")
    .select("user_id, pin_hash, failed_count, locked_until")
    .eq("user_id", userId)
    .maybeSingle();
  if (pin.error && !missingTable(pin.error)) throw dbFailure(pin.error, "user_pins read");
  if (pin.data?.pin_hash) {
    return {
      source: "user_pins",
      userId,
      hash: String(pin.data.pin_hash),
      failedCount: Number(pin.data.failed_count ?? 0),
      lockedUntil: (pin.data.locked_until as string | null) ?? null,
    };
  }
  const legacy = await db
    .from("genshin_logins")
    .select("user_id, secret_hash, failed_count, locked_until")
    .eq("user_id", userId)
    .maybeSingle();
  if (legacy.error && !missingTable(legacy.error)) throw dbFailure(legacy.error, "genshin_logins read");
  if (legacy.data?.secret_hash) {
    return {
      source: "genshin_logins",
      userId,
      hash: String(legacy.data.secret_hash),
      failedCount: Number(legacy.data.failed_count ?? 0),
      lockedUntil: (legacy.data.locked_until as string | null) ?? null,
    };
  }
  return null;
}

export async function saveFailure(db: SupabaseClient, cred: Credential, failures: number, lockedUntil: string | null) {
  await db.from(cred.source).update({ failed_count: failures, locked_until: lockedUntil }).eq("user_id", cred.userId);
}

export async function clearFailures(db: SupabaseClient, cred: Credential) {
  if (cred.failedCount || cred.lockedUntil) {
    await db.from(cred.source).update({ failed_count: 0, locked_until: null }).eq("user_id", cred.userId);
  }
}

/**
 * After a successful legacy login, copy the same hash into user_pins (if that table
 * exists and has no row). Same hash = same secret, so the session fingerprint is unchanged.
 */
export async function promoteLegacy(db: SupabaseClient, cred: Credential): Promise<void> {
  if (cred.source !== "genshin_logins") return;
  const { error } = await db
    .from("user_pins")
    .insert({ user_id: cred.userId, pin_hash: cred.hash, failed_count: 0 });
  if (error && error.code !== "23505" && !missingTable(error)) {
    console.warn("user_pins promote failed", error.code ?? "");
  }
}


/** IP throttle on public.auth_attempts (shared). Unavailable table = no IP throttle. */
const IP_WINDOW_MS = 10 * 60 * 1000;
const IP_MAX_FAILURES = 20;

export function clientIp(request: Request): string {
  return (request.headers.get("x-forwarded-for") || "").split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

export async function ipBlocked(db: SupabaseClient, ip: string): Promise<boolean> {
  const { count, error } = await db
    .from("auth_attempts")
    .select("id", { count: "exact", head: true })
    .eq("key", `ip:${ip}`)
    .eq("app", "genshin")
    .eq("ok", false)
    .gte("created_at", new Date(Date.now() - IP_WINDOW_MS).toISOString());
  if (error) return false;
  return (count ?? 0) >= IP_MAX_FAILURES;
}

export async function recordAttempt(db: SupabaseClient, ip: string, ok: boolean): Promise<void> {
  const { error } = await db.from("auth_attempts").insert({ key: `ip:${ip}`, app: "genshin", ok });
  if (error && !missingTable(error)) console.warn("auth_attempts insert failed", error.code ?? "");
}
