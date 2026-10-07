"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  EMPTY_STORE,
  readAccountStore,
  writeAccountStore,
  type AccountStore,
  type GameAccount,
} from "@/lib/accounts";
import { fetchAccountStore, saveAccountStore, type AccountCloud } from "@/lib/accountSync";

interface AccountContextValue {
  ready: boolean;
  cloud: AccountCloud | "checking";
  accounts: GameAccount[];
  active: GameAccount | null;
  save: (input: { id?: string; label: string; uid: string; cookie: string }) => GameAccount;
  activate: (id: string) => void;
  remove: (id: string) => void;
}

const AccountContext = createContext<AccountContextValue | null>(null);

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [store, setStore] = useState<AccountStore>(EMPTY_STORE);
  const [ready, setReady] = useState(false);
  const [cloud, setCloud] = useState<AccountCloud | "checking">("checking");
  const edited = useRef(false);
  const queue = useRef(Promise.resolve());

  const enqueue = useCallback((next: AccountStore) => {
    queue.current = queue.current
      .then(() => saveAccountStore(next))
      .then((result) => setCloud(result))
      .catch(() => setCloud("error"));
  }, []);

  const uploadLocalIfUntouched = useCallback((local: AccountStore) => {
    queue.current = queue.current
      .then(async () => {
        if (edited.current) return;
        const result = await saveAccountStore(local);
        if (!edited.current) setCloud(result);
      })
      .catch(() => {
        if (!edited.current) setCloud("error");
      });
  }, []);

  useEffect(() => {
    const local = readAccountStore();
    setStore(local);
    setReady(true);
    let cancel = false;
    void (async () => {
      const remote = await fetchAccountStore();
      if (cancel || edited.current) return;
      if (remote.status !== "ok") {
        setCloud(remote.status);
        return;
      }
      if (remote.store.accounts.length === 0) {
        setCloud("ok");
        if (local.accounts.length > 0) uploadLocalIfUntouched(local);
        return;
      }
      setStore(remote.store);
      writeAccountStore(remote.store);
      setCloud("ok");
    })();
    return () => {
      cancel = true;
    };
  }, [uploadLocalIfUntouched]);

  const commit = useCallback(
    (next: AccountStore) => {
      edited.current = true;
      setStore(next);
      writeAccountStore(next);
      enqueue(next);
    },
    [enqueue]
  );

  const save = useCallback(
    (input: { id?: string; label: string; uid: string; cookie: string }) => {
      const now = new Date().toISOString();
      const existing = input.id ? store.accounts.find((account) => account.id === input.id) : undefined;
      const account: GameAccount = {
        id: existing?.id ?? crypto.randomUUID(),
        label: input.label.trim() || input.uid,
        uid: input.uid,
        cookie: input.cookie.trim(),
        updatedAt: now,
      };
      const accounts = existing
        ? store.accounts.map((item) => (item.id === account.id ? account : item))
        : [...store.accounts, account];
      commit({ activeId: account.id, accounts });
      return account;
    },
    [commit, store.accounts]
  );

  const activate = useCallback(
    (id: string) => {
      if (!store.accounts.some((account) => account.id === id)) return;
      commit({ ...store, activeId: id });
    },
    [commit, store]
  );

  const remove = useCallback(
    (id: string) => {
      const accounts = store.accounts.filter((account) => account.id !== id);
      const activeId = store.activeId === id ? accounts[0]?.id ?? null : store.activeId;
      commit({ activeId, accounts });
      localStorage.removeItem(`genshin-party:${id}`);
    },
    [commit, store]
  );

  const active = store.accounts.find((account) => account.id === store.activeId) ?? null;
  const value = useMemo(
    () => ({ ready, cloud, accounts: store.accounts, active, save, activate, remove }),
    [ready, cloud, store.accounts, active, save, activate, remove]
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccounts() {
  const context = useContext(AccountContext);
  if (!context) throw new Error("useAccounts는 AccountProvider 안에서만 씁니다.");
  return context;
}
