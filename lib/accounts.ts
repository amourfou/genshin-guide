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

export const ACCOUNT_KEY = "genshin-accounts-v1";

export const EMPTY_STORE: AccountStore = { activeId: null, accounts: [] };

export function readAccountStore(): AccountStore {
  if (typeof window === "undefined") return EMPTY_STORE;
  try {
    const raw = localStorage.getItem(ACCOUNT_KEY);
    if (!raw) return EMPTY_STORE;
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

export function writeAccountStore(store: AccountStore): void {
  localStorage.setItem(ACCOUNT_KEY, JSON.stringify(store));
}

export function maskCookie(cookie: string): string {
  if (!cookie) return "쿠키 없음 · 전시 캐릭터만";
  return `쿠키 저장됨 · ${cookie.length}자`;
}
