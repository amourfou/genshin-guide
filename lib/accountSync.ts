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

const NIL_ID = "00000000-0000-0000-0000-000000000000";

function missingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "PGRST205" || error.code === "42P01" || error.code === "PGRST204") return true;
  return /schema cache|does not exist|Could not find the table/i.test(error.message ?? "");
}

function asCloud(error: { code?: string; message?: string } | null): Exclude<AccountCloud, "ok"> {
  if (!error || !missingTable(error)) return "error";
  return "missing";
}

export async function fetchAccountStore(): Promise<RemoteAccounts> {
  if (!supabase) return { status: "off" };
  const { data, error } = await supabase
    .from("genshin_accounts")
    .select("id, label, uid, cookie, active, position, updated_at")
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

export async function saveAccountStore(store: AccountStore): Promise<AccountCloud> {
  if (!supabase) return "off";
  const cleared = await supabase.from("genshin_accounts").update({ active: false }).neq("id", NIL_ID);
  if (cleared.error) return asCloud(cleared.error);

  const rows = store.accounts.map((account, position) => ({
    id: account.id,
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
      ? await supabase.from("genshin_accounts").delete().neq("id", NIL_ID)
      : await supabase.from("genshin_accounts").delete().not("id", "in", `(${ids.join(",")})`);
  if (removed.error) return asCloud(removed.error);
  return "ok";
}
