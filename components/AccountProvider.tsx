"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  EMPTY_LIST,
  clearLegacyAccountStore,
  readAccountCache,
  readLocalCookies,
  writeAccountCache,
  type AccountList,
  type GameAccount,
} from "@/lib/accounts";
import { activateAccount, deleteAccount, fetchAccounts, saveAccount, type AccountInput } from "@/lib/accountApi";
import { syncAccountParties } from "@/lib/partySync";
import { partyStorageKey } from "@/lib/partyStore";
import { useSession } from "@/components/SessionProvider";

export type AccountCloud = "checking" | "ok" | "error";

interface AccountContextValue {
  ready: boolean;
  cloud: AccountCloud;
  /** Last failed server request, shown to the user. Empty when the last request worked. */
  problem: string;
  accounts: GameAccount[];
  active: GameAccount | null;
  save: (input: Omit<AccountInput, "migrate">) => Promise<{ ok: true; account: GameAccount } | { ok: false; error: string }>;
  activate: (id: string) => void;
  remove: (id: string) => Promise<boolean>;
}

const AccountContext = createContext<AccountContextValue | null>(null);

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const { ready: sessionReady, user, logout } = useSession();
  const [list, setList] = useState<AccountList>(EMPTY_LIST);
  const [ready, setReady] = useState(false);
  const [cloud, setCloud] = useState<AccountCloud>("checking");
  const [problem, setProblem] = useState("");
  const listRef = useRef(list);
  listRef.current = list;

  const failed = useCallback(
    (status: number, error: string) => {
      setCloud("error");
      setProblem(error);
      if (status === 401) logout();
    },
    [logout]
  );

  const apply = useCallback(
    (next: AccountList) => {
      setList(next);
      setCloud("ok");
      setProblem("");
      if (user) writeAccountCache(user.id, next);
    },
    [user]
  );

  useEffect(() => {
    if (!sessionReady) return;
    if (!user) {
      setList(EMPTY_LIST);
      setReady(true);
      return;
    }
    const userId = user.id;
    setList(readAccountCache(userId));
    setReady(true);
    setCloud("checking");
    let cancel = false;

    void (async () => {
      const remote = await fetchAccounts();
      if (cancel) return;
      if (!remote.ok) {
        failed(remote.status, `계정을 불러오지 못했습니다. ${remote.error}`);
        return;
      }
      // Older builds kept cookies in this browser. Hand them to the server once, never overwriting it.
      const { own, legacy } = readLocalCookies(userId, user.name);
      const known = new Map(remote.data.accounts.map((account) => [account.id, account]));
      const uploads = [
        ...own.filter((account) => known.get(account.id) && !known.get(account.id)?.hasCookie),
        ...legacy.filter((account) => !known.has(account.id)),
      ];
      let latest = remote.data;
      let stuck = false;
      for (const account of uploads) {
        const saved = await saveAccount({ ...account, migrate: true });
        if (cancel) return;
        if (saved.ok) latest = saved.data.list;
        else if (saved.status !== 409) stuck = true;
      }
      if (stuck) {
        setList(latest);
        failed(500, "이 기기에 남은 쿠키를 서버로 옮기지 못했습니다. 다시 열면 한 번 더 시도합니다.");
        return;
      }
      apply(latest);
      if (legacy.length > 0) clearLegacyAccountStore();
    })();

    return () => {
      cancel = true;
    };
  }, [sessionReady, user, failed, apply]);

  const accountIds = list.accounts.map((account) => account.id).join(",");
  useEffect(() => {
    if (!ready || !user || !accountIds || cloud !== "ok") return;
    void syncAccountParties(accountIds.split(","));
  }, [ready, user, accountIds, cloud]);

  const save = useCallback(
    async (input: Omit<AccountInput, "migrate">) => {
      const result = await saveAccount(input);
      if (!result.ok) {
        failed(result.status, `저장하지 못했습니다. ${result.error}`);
        return { ok: false as const, error: result.error };
      }
      apply(result.data.list);
      return { ok: true as const, account: result.data.account };
    },
    [apply, failed]
  );

  const activate = useCallback(
    (id: string) => {
      const before = listRef.current;
      if (!before.accounts.some((account) => account.id === id) || before.activeId === id) return;
      setList({ ...before, activeId: id });
      void activateAccount(id).then((result) => {
        if (result.ok) apply(result.data);
        else failed(result.status, `사용할 계정을 저장하지 못했습니다. ${result.error}`);
      });
    },
    [apply, failed]
  );

  const remove = useCallback(
    async (id: string) => {
      const result = await deleteAccount(id);
      if (!result.ok) {
        failed(result.status, `삭제하지 못했습니다. ${result.error}`);
        return false;
      }
      localStorage.removeItem(partyStorageKey(id));
      apply(result.data);
      return true;
    },
    [apply, failed]
  );

  const active = list.accounts.find((account) => account.id === list.activeId) ?? null;
  const value = useMemo(
    () => ({ ready: sessionReady && ready, cloud, problem, accounts: list.accounts, active, save, activate, remove }),
    [sessionReady, ready, cloud, problem, list.accounts, active, save, activate, remove]
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccounts() {
  const context = useContext(AccountContext);
  if (!context) throw new Error("useAccounts는 AccountProvider 안에서만 씁니다.");
  return context;
}
