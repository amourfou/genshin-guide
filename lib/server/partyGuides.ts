import "server-only";
import { parseCombatAnswer, type PartyGuide } from "@/lib/partyBrief";
import { chooseStoredGuide, type GuideLookup, type StoredGuideRow } from "@/lib/partyGuideLookup";
import { adminDb } from "@/lib/server/db";

const TABLE = "genshin_party_guides";
const EMPTY: GuideLookup = { exact: null, previous: null };

function parseStored(value: unknown): PartyGuide | null {
  const guide = parseCombatAnswer(value);
  if (!guide) return null;
  const raw = value && typeof value === "object" ? (value as { sources?: unknown }).sources : undefined;
  guide.sources = Array.isArray(raw)
    ? raw.filter((item): item is string => typeof item === "string" && item.startsWith("https://")).slice(0, 4)
    : [];
  return guide;
}

/** Reads only this user's rows. Missing table or any error means "nothing saved" (AI fallback). */
export async function loadPartyGuide(userId: string, memberKey: string, briefKey: string): Promise<GuideLookup> {
  const db = adminDb();
  if (!db) return EMPTY;
  try {
    const { data, error } = await db
      .from(TABLE)
      .select("brief_key, body, updated_at")
      .eq("user_id", userId)
      .eq("member_key", memberKey)
      .order("updated_at", { ascending: false })
      .limit(5);
    if (error) {
      console.error("party guide load failed", error.code ?? "", error.message ?? "");
      return EMPTY;
    }
    return chooseStoredGuide((data ?? []) as StoredGuideRow[], briefKey, parseStored);
  } catch (error) {
    console.error("party guide load failed", error instanceof Error ? error.message : "unknown");
    return EMPTY;
  }
}

/** Best effort: a failed save is logged and never blocks the answer. */
export async function savePartyGuide(userId: string, memberKey: string, briefKey: string, guide: PartyGuide): Promise<void> {
  const db = adminDb();
  if (!db) return;
  try {
    const { error } = await db
      .from(TABLE)
      .upsert(
        { user_id: userId, member_key: memberKey, brief_key: briefKey, body: guide, updated_at: new Date().toISOString() },
        { onConflict: "user_id,brief_key" }
      );
    if (error) console.error("party guide save failed", error.code ?? "", error.message ?? "");
  } catch (error) {
    console.error("party guide save failed", error instanceof Error ? error.message : "unknown");
  }
}
