"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { clearSession, getUserById, loginByName, readSession, writeSession, type AppUser } from "@/lib/session";

interface SessionContextValue {
  ready: boolean;
  user: AppUser | null;
  login: (name: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readSession();
    if (!stored) {
      setReady(true);
      return;
    }
    setUser(stored);
    setReady(true);
    let cancel = false;
    void (async () => {
      const found = await getUserById(stored.id);
      if (cancel) return;
      if (found.missing) {
        clearSession();
        setUser(null);
        return;
      }
      if (found.user) {
        writeSession(found.user);
        setUser(found.user);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const login = useCallback(async (name: string) => {
    const result = await loginByName(name);
    if (!result.user) return { ok: false, error: result.error };
    writeSession(result.user);
    setUser(result.user);
    return { ok: true };
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ ready, user, login, logout }), [ready, user, login, logout]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession은 SessionProvider 안에서만 씁니다.");
  return context;
}
