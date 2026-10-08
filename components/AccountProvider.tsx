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
  LEGACY_OWNER_NAME,
  clearLegacyAccountStore,
  mergeAccountStores,
  readAccountStore,
  readLegacyAccountStore,
  writeAccountStore,
  type AccountStore,
  type GameAccount,
} from "@/lib/accounts";
import { fetchAccountStore, fetchExistingAccountIds, saveAccountStore, type AccountCloud } from "@/lib/accountSync";
import { deleteParty, syncAccountParties } from "@/lib/partySync";
import { partyStorageKey } from "@/lib/partyStore";
import { useSession } from "@/components/SessionProvider";

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
  const { ready: sessionReady, user } = useSession();
  const [store, setStore] = useState<AccountStore>(EMPTY_STORE);
  const [ready, setReady] = useState(false);
  const [cloud, setCloud] = useState<AccountCloud | "checking">("checking");
  const edited = useRef(false);
  const queue = useRef(Promise.resolve());
  const userIdRef = useRef<string | null>(null);
  userIdRef.current = user?.id ?? null;

  const enqueue = useCallback((next: AccountStore) => {
    const userId = userIdRef.current;
    if (!userId) return;
    queue.current = queue.current
      .then(() => saveAccountStore(userId, next))
      .then((result) => setCloud(result))
      .catch(() => setCloud("error"));
  }, []);

  useEffect(() => {
    edited.current = false;
    if (!sessionReady) return;
    if (!user) {
      setStore(EMPTY_STORE);
      setCloud("off");
      setReady(true);
      return;
    }

    const userId = user.id;
    const legacy = user.name === LEGACY_OWNER_NAME ? readLegacyAccountStore() : EMPTY_STORE;
    const local = mergeAccountStores(readAccountStore(userId), legacy);
    setStore(local);
    setReady(true);
    let cancel = false;

    void (async () => {
      const remote = await fetchAccountStore(userId);
      if (cancel || edited.current) return;
      if (remote.status !== "ok") {
        setCloud(remote.status);
        return;
      }
      const known = await fetchExistingAccountIds(legacy.accounts.map((account) => account.id));
      if (cancel || edited.current) return;
      if (legacy.accounts.length > 0 && known.status !== "ok") {
        setStore(remote.store);
        writeAccountStore(userId, remote.store);
        setCloud(known.status);
        return;
      }
      const knownIds = new Set(known.status === "ok" ? known.ids : []);
      const claimable = legacy.accounts.filter((account) => !knownIds.has(account.id));
      const merged = mergeAccountStores(remote.store, { activeId: null, accounts: claimable });
      if (edited.current) return;
      setStore(merged);
      writeAccountStore(userId, merged);
      setCloud("ok");
      if (claimable.length > 0) {
        queue.current = queue.current
          .then(() => saveAccountStore(userId, merged))
          .then((result) => {
            if (!edited.current) setCloud(result);
            if (result === "ok") clearLegacyAccountStore();
          })
          .catch(() => {
            if (!edited.current) setCloud("error");
          });
        return;
      }
      if (legacy.accounts.length > 0) clearLegacyAccountStore();
    })();

    return () => {
      cancel = true;
    };
  }, [sessionReady, user]);

  const accountIds = store.accounts.map((account) => account.id).join(",");
  useEffect(() => {
    if (!ready || !user || !accountIds) return;
    void syncAccountParties(user.id, accountIds.split(","));
  }, [ready, user, accountIds]);

  const commit = useCallback(
    (next: AccountStore) => {
      const userId = userIdRef.current;
      if (!userId) return;
      edited.current = true;
      setStore(next);
      writeAccountStore(userId, next);
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
      localStorage.removeItem(partyStorageKey(id));
      const userId = userIdRef.current;
      if (userId) void deleteParty(userId, id);
    },
    [commit, store]
  );

  const active = store.accounts.find((account) => account.id === store.activeId) ?? null;
  const value = useMemo(
    () => ({ ready: sessionReady && ready, cloud, accounts: store.accounts, active, save, activate, remove }),
    [sessionReady, ready, cloud, store.accounts, active, save, activate, remove]
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccounts() {
  const context = useContext(AccountContext);
  if (!context) throw new Error("useAccounts는 AccountProvider 안에서만 씁니다.");
  return context;
}
