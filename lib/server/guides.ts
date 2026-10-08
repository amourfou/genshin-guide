import "server-only";
import { LOCAL_GUIDES } from "@/lib/guides";
import { adminDb } from "@/lib/server/db";
import type { GuideSetOption, GuideTemplate, Scaling, StatKey, TalentFocus } from "@/lib/types";

interface GuideRow {
  character_id: number;
  role: string;
  scaling: Scaling;
  sands: StatKey[];
  goblet: StatKey[];
  circlet: StatKey[];
  sets: GuideSetOption[];
  set_note: string;
  substats: string;
  er_min: number;
  er_note: string;
  talent_focus: TalentFocus;
  talent_note: string;
  weapon_note: string;
  team_note: string;
}

function isTemplate(row: GuideRow): boolean {
  return Boolean(row && row.character_id && row.role && Array.isArray(row.sands) && Array.isArray(row.sets));
}

/** lib/guides.ts first; a genshin_guides row with the same character_id replaces that character. */
export async function loadGuides(): Promise<Record<number, GuideTemplate>> {
  const guides: Record<number, GuideTemplate> = { ...LOCAL_GUIDES };
  const db = adminDb();
  if (!db) return guides;
  const { data, error } = await db.from("genshin_guides").select("*");
  if (error || !data) return guides;
  for (const raw of data as GuideRow[]) {
    if (!isTemplate(raw)) continue;
    guides[raw.character_id] = {
      id: raw.character_id,
      role: raw.role,
      scaling: raw.scaling,
      sands: raw.sands,
      goblet: raw.goblet,
      circlet: raw.circlet,
      sets: raw.sets,
      setNote: raw.set_note ?? "",
      substats: raw.substats ?? "",
      erMin: raw.er_min ?? 100,
      erNote: raw.er_note ?? "",
      talentFocus: raw.talent_focus ?? "burst",
      talentNote: raw.talent_note ?? "",
      weaponNote: raw.weapon_note ?? "",
      teamNote: raw.team_note ?? "",
    };
  }
  return guides;
}
