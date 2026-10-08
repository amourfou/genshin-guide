"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  clearLegacySession,
  fetchSession,
  legacySessionName,
  login as loginRequest,
  logout as logoutRequest,
  type AppUser,
  type LoginResult,
} from "@/lib/session";

interface SessionContextValue {
  ready: boolean;
  user: AppUser | null;
  /** Shown on the login screen when the server could not check the session. */
  problem: string;
  /** Name remembered by an older build, to prefill the login form. */
  savedName: string;
  login: (name: string, password: string, setup: boolean) => Promise<LoginResult>;
  logout: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [ready, setReady] = useState(false);
  const [problem, setProblem] = useState("");
  const [savedName, setSavedName] = useState("");

  useEffect(() => {
    let cancel = false;
    setSavedName(legacySessionName());
    void fetchSession().then((result) => {
      if (cancel) return;
      setUser(result.user);
      setProblem(result.error ?? "");
      if (result.user) clearLegacySession();
      setReady(true);
    });
    return () => {
      cancel = true;
    };
  }, []);

  const login = useCallback(async (name: string, password: string, setup: boolean) => {
    const result = await loginRequest(name, password, setup);
    if (result.ok) {
      clearLegacySession();
      setProblem("");
      setUser(result.user);
    }
    return result;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    void logoutRequest();
  }, []);

  const value = useMemo(
    () => ({ ready, user, problem, savedName, login, logout }),
    [ready, user, problem, savedName, login, logout]
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession은 SessionProvider 안에서만 씁니다.");
  return context;
}
