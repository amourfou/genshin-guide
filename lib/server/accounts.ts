import "server-only";
import crypto from "crypto";
import type { AccountList, GameAccount } from "@/lib/accounts";
import { sanitizeCookie } from "@/lib/hoyolab";
import { ApiError, dbFailure, requireDb } from "@/lib/server/db";
import { isUid } from "@/lib/uid";

interface Row {
  id: string;
  label: string | null;
  uid: string | null;
  cookie: string | null;
  active: boolean | null;
  position: number | null;
  updated_at: string | null;
}

const COLUMNS = "id, label, uid, cookie, active, position, updated_at";

/** Cookie values never leave the server. The browser only learns whether one is stored. */
function summary(row: Row): GameAccount {
  const cookie = row.cookie ?? "";
  return {
    id: row.id,
    label: row.label || row.uid || "",
    uid: row.uid || "",
    hasCookie: cookie.length > 0,
    cookieLength: cookie.length,
    updatedAt: row.updated_at || new Date(0).toISOString(),
  };
}

async function rows(userId: string): Promise<Row[]> {
  const { data, error } = await requireDb()
    .from("genshin_accounts")
    .select(COLUMNS)
    .eq("user_id", userId)
    .order("position", { ascending: true });
  if (error) throw dbFailure(error, "accounts list");
  return (data ?? []) as Row[];
}

export async function listAccounts(userId: string): Promise<AccountList> {
  const list = await rows(userId);
  return {
    activeId: list.find((row) => row.active)?.id ?? list[0]?.id ?? null,
    accounts: list.filter((row) => row.id && row.uid).map(summary),
  };
}

async function owned(userId: string, id: string): Promise<Row | null> {
  const { data, error } = await requireDb()
    .from("genshin_accounts")
    .select(`${COLUMNS}, user_id`)
    .eq("id", id)
    .maybeSingle();
  if (error) throw dbFailure(error, "account read");
  if (!data) return null;
  if ((data as { user_id: string }).user_id !== userId) throw new ApiError(404, "계정을 찾지 못했습니다.");
  return data as Row;
}

/** Server-only: the stored uid and cookie for one of the caller's accounts. */
export async function accountSecret(userId: string, id: string): Promise<{ uid: string; cookie: string }> {
  const row = await owned(userId, id);
  if (!row?.uid) throw new ApiError(404, "계정을 찾지 못했습니다.");
  return { uid: row.uid, cookie: row.cookie ?? "" };
}

export async function setActive(userId: string, id: string): Promise<void> {
  if (!(await owned(userId, id))) throw new ApiError(404, "계정을 찾지 못했습니다.");
  const db = requireDb();
  const cleared = await db.from("genshin_accounts").update({ active: false }).eq("user_id", userId).neq("id", id);
  if (cleared.error) throw dbFailure(cleared.error, "account deactivate");
  const set = await db.from("genshin_accounts").update({ active: true }).eq("user_id", userId).eq("id", id);
  if (set.error) throw dbFailure(set.error, "account activate");
}

export interface SaveInput {
  id?: string;
  label?: string;
  uid?: string;
  cookie?: string;
  clearCookie?: boolean;
  /** One-time upload of an account and cookie that only lived in this browser. Never overwrites. */
  migrate?: boolean;
}

function cleanCookie(raw: string | undefined): string | null {
  if (raw == null || !raw.trim()) return null;
  return sanitizeCookie(raw);
}

export async function saveAccount(userId: string, input: SaveInput): Promise<GameAccount> {
  const uid = String(input.uid ?? "").replace(/\D/g, "");
  if (!isUid(uid)) throw new ApiError(400, "UID는 9자리 숫자입니다.");
  const label = String(input.label ?? "").trim().slice(0, 40) || uid;
  const cookie = cleanCookie(input.cookie);
  const now = new Date().toISOString();
  const db = requireDb();

  if (input.id && !/^[0-9a-f-]{36}$/i.test(input.id)) throw new ApiError(400, "계정 id가 잘못되었습니다.");
  let existing: Row | null = null;
  if (input.id) {
    try {
      existing = await owned(userId, input.id);
    } catch (error) {
      if (input.migrate && error instanceof ApiError && error.status === 404) throw new ApiError(409, "다른 사용자의 계정입니다.");
      throw error;
    }
  }

  if (existing) {
    if (input.migrate) {
      if (!cookie || existing.cookie) return summary(existing);
      const { data, error } = await db
        .from("genshin_accounts")
        .update({ cookie, updated_at: now })
        .eq("id", existing.id)
        .eq("user_id", userId)
        .select(COLUMNS)
        .single();
      if (error) throw dbFailure(error, "account migrate cookie");
      return summary(data as Row);
    }
    const patch: Record<string, unknown> = { label, uid, updated_at: now };
    if (cookie) patch.cookie = cookie;
    else if (input.clearCookie) patch.cookie = "";
    const { data, error } = await db
      .from("genshin_accounts")
      .update(patch)
      .eq("id", existing.id)
      .eq("user_id", userId)
      .select(COLUMNS)
      .single();
    if (error) throw dbFailure(error, "account update");
    if (!input.migrate) await setActive(userId, existing.id);
    return summary(data as Row);
  }

  const current = await rows(userId);
  const position = current.reduce((max, row) => Math.max(max, row.position ?? 0), -1) + 1;
  const { data, error } = await db
    .from("genshin_accounts")
    .insert({
      id: input.id ?? crypto.randomUUID(),
      user_id: userId,
      label,
      uid,
      cookie: cookie ?? "",
      active: false,
      position,
      updated_at: now,
    })
    .select(COLUMNS)
    .single();
  if (error) throw dbFailure(error, "account insert");
  const saved = data as Row;
  if (!input.migrate || current.length === 0) await setActive(userId, saved.id);
  return summary(saved);
}

export async function deleteAccount(userId: string, id: string): Promise<void> {
  const row = await owned(userId, id);
  if (!row) return;
  const { error } = await requireDb().from("genshin_accounts").delete().eq("id", id).eq("user_id", userId);
  if (error) throw dbFailure(error, "account delete");
  if (row.active) {
    const next = (await rows(userId))[0];
    if (next) await setActive(userId, next.id);
  }
}
