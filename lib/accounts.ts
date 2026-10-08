/** What the browser knows about a 원신 account. The HoYoLAB cookie itself stays on the server. */
export interface GameAccount {
  id: string;
  label: string;
  uid: string;
  hasCookie: boolean;
  cookieLength: number;
  updatedAt: string;
}

export interface AccountList {
  activeId: string | null;
  accounts: GameAccount[];
}

/** Older builds kept the cookie in localStorage. Read once to move it to the server, then drop it. */
export interface LocalAccount {
  id: string;
  label: string;
  uid: string;
  cookie: string;
}

export const LEGACY_ACCOUNT_KEY = "genshin-accounts-v1";
export const LEGACY_OWNER_NAME = "광란의 사랑";

export const EMPTY_LIST: AccountList = { activeId: null, accounts: [] };

function accountStorageKey(userId: string): string {
  return `genshin-accounts:${userId}`;
}

function parseLocal(raw: string | null): LocalAccount[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as { accounts?: Array<Partial<LocalAccount>> };
    if (!parsed || !Array.isArray(parsed.accounts)) return [];
    return parsed.accounts.flatMap((account) =>
      account && account.id && account.uid
        ? [{ id: account.id, label: account.label ?? "", uid: account.uid, cookie: account.cookie ?? "" }]
        : []
    );
  } catch {
    return [];
  }
}

/** Accounts from older builds that still carry a cookie in this browser. */
export function readLocalCookies(userId: string, userName: string): { own: LocalAccount[]; legacy: LocalAccount[] } {
  if (typeof window === "undefined") return { own: [], legacy: [] };
  const own = parseLocal(localStorage.getItem(accountStorageKey(userId))).filter((account) => account.cookie);
  const legacy = userName === LEGACY_OWNER_NAME ? parseLocal(localStorage.getItem(LEGACY_ACCOUNT_KEY)) : [];
  return { own, legacy };
}

export function clearLegacyAccountStore(): void {
  localStorage.removeItem(LEGACY_ACCOUNT_KEY);
}

export function readAccountCache(userId: string): AccountList {
  if (typeof window === "undefined") return EMPTY_LIST;
  try {
    const parsed = JSON.parse(localStorage.getItem(accountStorageKey(userId)) ?? "") as {
      activeId?: string | null;
      accounts?: Array<Partial<GameAccount> & { cookie?: string }>;
    };
    if (!parsed || !Array.isArray(parsed.accounts)) return EMPTY_LIST;
    const accounts = parsed.accounts.flatMap((account) =>
      account && account.id && account.uid
        ? [
            {
              id: account.id,
              label: account.label || account.uid,
              uid: account.uid,
              hasCookie: account.hasCookie ?? Boolean(account.cookie),
              cookieLength: account.cookieLength ?? account.cookie?.length ?? 0,
              updatedAt: account.updatedAt ?? new Date(0).toISOString(),
            },
          ]
        : []
    );
    return { activeId: parsed.activeId ?? accounts[0]?.id ?? null, accounts };
  } catch {
    return EMPTY_LIST;
  }
}

/** Display cache only. Writing it also removes any cookie an older build left here. */
export function writeAccountCache(userId: string, list: AccountList): void {
  localStorage.setItem(accountStorageKey(userId), JSON.stringify(list));
}

export function maskCookie(account: Pick<GameAccount, "hasCookie" | "cookieLength">): string {
  if (!account.hasCookie) return "쿠키 없음 · 전시 캐릭터만";
  return `쿠키 저장됨 · ${account.cookieLength}자`;
}
