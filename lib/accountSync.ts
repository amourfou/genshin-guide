import { supabase } from "@/lib/supabase";
import type { AccountStore, GameAccount } from "@/lib/accounts";

export type AccountCloud = "off" | "ok" | "missing" | "error";

export type RemoteAccounts = { status: Exclude<AccountCloud, "ok"> } | { status: "ok"; store: AccountStore };

interface AccountRow {
  id: string;
  label: string | null;
  uid: string | null;
  cookie: string | null;
  active: boolean | null;
  position: number | null;
  updated_at: string | null;
}

function missingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "PGRST205" || error.code === "42P01" || error.code === "PGRST204") return true;
  return /schema cache|does not exist|Could not find the table|Could not find the '.+' column/i.test(error.message ?? "");
}

function asCloud(error: { code?: string; message?: string } | null): Exclude<AccountCloud, "ok"> {
  if (!error || !missingTable(error)) return "error";
  return "missing";
}

export async function fetchExistingAccountIds(ids: string[]): Promise<{ status: "ok"; ids: string[] } | { status: Exclude<AccountCloud, "ok"> }> {
  if (!supabase) return { status: "off" };
  if (ids.length === 0) return { status: "ok", ids: [] };
  const { data, error } = await supabase.from("genshin_accounts").select("id").in("id", ids);
  if (error || !data) return { status: asCloud(error) };
  return { status: "ok", ids: (data as { id: string }[]).map((row) => row.id) };
}

export async function fetchAccountStore(userId: string): Promise<RemoteAccounts> {
  if (!supabase) return { status: "off" };
  const { data, error } = await supabase
    .from("genshin_accounts")
    .select("id, label, uid, cookie, active, position, updated_at")
    .eq("user_id", userId)
    .order("position", { ascending: true });
  if (error || !data) return { status: asCloud(error) };
  const rows = (data as AccountRow[]).filter((row) => row.id && row.uid);
  const accounts: GameAccount[] = rows.map((row) => ({
    id: row.id,
    label: row.label || row.uid || "",
    uid: row.uid || "",
    cookie: row.cookie ?? "",
    updatedAt: row.updated_at || new Date().toISOString(),
  }));
  const active = rows.find((row) => row.active);
  return {
    status: "ok",
    store: { activeId: active?.id ?? accounts[0]?.id ?? null, accounts },
  };
}

export async function saveAccountStore(userId: string, store: AccountStore): Promise<AccountCloud> {
  if (!supabase) return "off";
  const cleared = await supabase.from("genshin_accounts").update({ active: false }).eq("user_id", userId);
  if (cleared.error) return asCloud(cleared.error);

  const rows = store.accounts.map((account, position) => ({
    id: account.id,
    user_id: userId,
    label: account.label,
    uid: account.uid,
    cookie: account.cookie,
    active: account.id === store.activeId,
    position,
    updated_at: account.updatedAt,
  }));
  if (rows.length > 0) {
    const saved = await supabase.from("genshin_accounts").upsert(rows);
    if (saved.error) return asCloud(saved.error);
  }

  const ids = rows.map((row) => row.id);
  const removed =
    ids.length === 0
      ? await supabase.from("genshin_accounts").delete().eq("user_id", userId)
      : await supabase.from("genshin_accounts").delete().eq("user_id", userId).not("id", "in", `(${ids.join(",")})`);
  if (removed.error) return asCloud(removed.error);
  return "ok";
}
