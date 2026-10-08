export interface GameAccount {
  id: string;
  label: string;
  uid: string;
  cookie: string;
  updatedAt: string;
}

export interface AccountStore {
  activeId: string | null;
  accounts: GameAccount[];
}

export const LEGACY_ACCOUNT_KEY = "genshin-accounts-v1";
export const LEGACY_OWNER_NAME = "광란의 사랑";

export const EMPTY_STORE: AccountStore = { activeId: null, accounts: [] };

function accountStorageKey(userId: string): string {
  return `genshin-accounts:${userId}`;
}

function parseStore(raw: string | null): AccountStore {
  if (!raw) return EMPTY_STORE;
  try {
    const parsed = JSON.parse(raw) as AccountStore;
    if (!parsed || !Array.isArray(parsed.accounts)) return EMPTY_STORE;
    return {
      activeId: parsed.activeId ?? null,
      accounts: parsed.accounts.filter((account) => account && account.id && account.uid),
    };
  } catch {
    return EMPTY_STORE;
  }
}

export function readAccountStore(userId: string): AccountStore {
  if (typeof window === "undefined") return EMPTY_STORE;
  return parseStore(localStorage.getItem(accountStorageKey(userId)));
}

export function readLegacyAccountStore(): AccountStore {
  if (typeof window === "undefined") return EMPTY_STORE;
  return parseStore(localStorage.getItem(LEGACY_ACCOUNT_KEY));
}

export function clearLegacyAccountStore(): void {
  localStorage.removeItem(LEGACY_ACCOUNT_KEY);
}

export function writeAccountStore(userId: string, store: AccountStore): void {
  localStorage.setItem(accountStorageKey(userId), JSON.stringify(store));
}

export function mergeAccountStores(primary: AccountStore, extra: AccountStore): AccountStore {
  const seen = new Set(primary.accounts.map((account) => account.id));
  const accounts = [...primary.accounts];
  for (const account of extra.accounts) {
    if (seen.has(account.id)) continue;
    seen.add(account.id);
    accounts.push(account);
  }
  return { activeId: primary.activeId ?? extra.activeId ?? accounts[0]?.id ?? null, accounts };
}

export function maskCookie(cookie: string): string {
  if (!cookie) return "쿠키 없음 · 전시 캐릭터만";
  return `쿠키 저장됨 · ${cookie.length}자`;
}
