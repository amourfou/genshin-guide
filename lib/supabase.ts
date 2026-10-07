import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { LOCAL_GUIDES } from "@/lib/guides";
import type { GuideSetOption, GuideTemplate, Scaling, StatKey, TalentFocus } from "@/lib/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

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
  return Boolean(
    row &&
      row.character_id &&
      row.role &&
      Array.isArray(row.sands) &&
      Array.isArray(row.sets)
  );
}

export async function loadGuides(): Promise<Record<number, GuideTemplate>> {
  const guides: Record<number, GuideTemplate> = { ...LOCAL_GUIDES };
  if (!supabase) return guides;
  const { data, error } = await supabase.from("genshin_guides").select("*");
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
