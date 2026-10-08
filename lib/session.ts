import { supabase } from "@/lib/supabase";

const SESSION_KEY = "genshin-user";

export interface AppUser {
  id: string;
  name: string;
}

export function readSession(): AppUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppUser;
    if (!parsed?.id || !parsed?.name) return null;
    return { id: parsed.id, name: parsed.name };
  } catch {
    return null;
  }
}

export function writeSession(user: AppUser): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export async function getUserById(id: string): Promise<{ user: AppUser | null; missing: boolean }> {
  if (!supabase) return { user: null, missing: false };
  const { data, error } = await supabase.from("users").select("id, name").eq("id", id).maybeSingle();
  if (error) return { user: null, missing: false };
  if (!data?.id || !data?.name) return { user: null, missing: true };
  return { user: { id: data.id, name: data.name }, missing: false };
}

export async function loginByName(name: string): Promise<{ user: AppUser | null; error?: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { user: null, error: "이름을 입력해 주세요." };
  if (!supabase) return { user: null, error: "연결하지 못했습니다." };

  const { data, error } = await supabase.from("users").select("id, name").eq("name", trimmed).maybeSingle();
  if (error) return { user: null, error: "사용자를 확인하지 못했습니다." };
  if (!data?.id || !data?.name) return { user: null, error: "등록된 이름이 없습니다." };

  await supabase.from("users").update({ updated_at: new Date().toISOString() }).eq("id", data.id);
  return { user: { id: data.id, name: data.name } };
}
