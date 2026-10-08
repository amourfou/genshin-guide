import type { AccountList, GameAccount } from "@/lib/accounts";
import { api } from "@/lib/api";

export type Result<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

function plain<T>(result: Awaited<ReturnType<typeof api<T>>>): Result<T> {
  return result.ok ? result : { ok: false, status: result.status, error: result.error };
}

export async function fetchAccounts(): Promise<Result<AccountList>> {
  return plain(await api<AccountList>("/api/accounts"));
}

export interface AccountInput {
  id?: string;
  label: string;
  uid: string;
  /** Empty keeps the stored cookie. */
  cookie?: string;
  clearCookie?: boolean;
  migrate?: boolean;
}

export async function saveAccount(input: AccountInput): Promise<Result<{ account: GameAccount; list: AccountList }>> {
  return plain(await api<{ account: GameAccount; list: AccountList }>("/api/accounts", { method: "POST", body: input }));
}

export async function activateAccount(id: string): Promise<Result<AccountList>> {
  return plain(await api<AccountList>("/api/accounts/active", { method: "POST", body: { id } }));
}

export async function deleteAccount(id: string): Promise<Result<AccountList>> {
  return plain(await api<AccountList>(`/api/accounts?id=${encodeURIComponent(id)}`, { method: "DELETE" }));
}
