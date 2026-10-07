"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAccounts } from "@/components/AccountProvider";
import type { ProfilePayload } from "@/lib/types";

interface ProfileContextValue {
  profile: ProfilePayload | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

function cacheKey(id: string, updatedAt: string) {
  return `genshin-profile:${id}:${updatedAt}`;
}

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { active, ready } = useAccounts();
  const [profile, setProfile] = useState<ProfilePayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const refresh = useCallback(() => {
    if (active) sessionStorage.removeItem(cacheKey(active.id, active.updatedAt));
    setNonce((value) => value + 1);
  }, [active]);

  useEffect(() => {
    if (!ready) return;
    if (!active) {
      setProfile(null);
      setError(null);
      setLoading(false);
      return;
    }

    const key = cacheKey(active.id, active.updatedAt);
    if (nonce === 0) {
      const cached = sessionStorage.getItem(key);
      if (cached) {
        try {
          setProfile(JSON.parse(cached) as ProfilePayload);
        } catch {
          sessionStorage.removeItem(key);
        }
      }
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);
    void fetch("/api/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ uid: active.uid, cookie: active.cookie || undefined }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const json = (await response.json()) as ProfilePayload & { error?: string };
        if (!response.ok) throw new Error(json.error || "계정을 불러오지 못했습니다.");
        setProfile(json);
        sessionStorage.setItem(key, JSON.stringify(json));
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setError(reason instanceof Error ? reason.message : "계정을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [active, ready, nonce]);

  const value = useMemo(
    () => ({ profile, loading, error, refresh }),
    [profile, loading, error, refresh]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) throw new Error("useProfile은 ProfileProvider 안에서만 씁니다.");
  return context;
}
