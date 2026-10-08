import { parseCombatAnswer, type PartyGuide } from "@/lib/partyBrief";

const CACHE_KEY = "genshin-combat-cache";
const CACHE_LIMIT = 24;

export type CachedCombat = PartyGuide;

export function readCombatCache(key: string): CachedCombat | null {
  const store = readStore();
  return store[key] ?? null;
}

export function writeCombatCache(key: string, entry: CachedCombat): void {
  const store = readStore();
  const next: Record<string, CachedCombat> = { [key]: entry };
  for (const [savedKey, saved] of Object.entries(store)) {
    if (savedKey === key) continue;
    next[savedKey] = saved;
    if (Object.keys(next).length >= CACHE_LIMIT) break;
  }
  writeStore(next);
}

export function clearCombatCache(key: string): void {
  const store = readStore();
  delete store[key];
  writeStore(store);
}

function readStore(): Record<string, CachedCombat> {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(CACHE_KEY) ?? "") as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const store: Record<string, CachedCombat> = {};
    for (const [key, value] of Object.entries(parsed)) {
      const guide = parseCombatAnswer(value);
      if (!guide) continue;
      const rawSources = (value as { sources?: unknown }).sources;
      guide.sources = Array.isArray(rawSources)
        ? rawSources.filter((source): source is string => typeof source === "string" && source.startsWith("https://")).slice(0, 4)
        : [];
      store[key] = guide;
    }
    return store;
  } catch {
    return {};
  }
}

function writeStore(store: Record<string, CachedCombat>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CACHE_KEY, JSON.stringify(store));
}
