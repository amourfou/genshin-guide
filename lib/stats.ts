import type { ElementKey, StatKey } from "@/lib/types";

export const STAT_LABEL: Record<StatKey, string> = {
  hp: "생명력",
  hp_: "생명력%",
  atk: "공격력",
  atk_: "공격력%",
  def: "방어력",
  def_: "방어력%",
  em: "원소 마스터리",
  er: "원소 충전 효율",
  cr: "치명타 확률",
  cd: "치명타 피해",
  heal: "치유 보너스",
  pyro: "불 원소 피해",
  hydro: "물 원소 피해",
  electro: "번개 원소 피해",
  cryo: "얼음 원소 피해",
  anemo: "바람 원소 피해",
  geo: "바위 원소 피해",
  dendro: "풀 원소 피해",
  physical: "물리 피해",
};

export const ELEMENT_LABEL: Record<ElementKey, string> = {
  pyro: "불",
  hydro: "물",
  electro: "번개",
  cryo: "얼음",
  anemo: "바람",
  geo: "바위",
  dendro: "풀",
  none: "무",
};

export const ELEMENT_CLASS: Record<ElementKey, string> = {
  pyro: "bg-orange-500/15 text-orange-300 ring-orange-400/30",
  hydro: "bg-sky-500/15 text-sky-300 ring-sky-400/30",
  electro: "bg-violet-500/15 text-violet-300 ring-violet-400/30",
  cryo: "bg-cyan-500/15 text-cyan-200 ring-cyan-300/30",
  anemo: "bg-teal-500/15 text-teal-200 ring-teal-300/30",
  geo: "bg-amber-500/15 text-amber-200 ring-amber-300/30",
  dendro: "bg-lime-500/15 text-lime-200 ring-lime-300/30",
  none: "bg-slate-500/15 text-slate-300 ring-slate-400/30",
};

const WEAPON_LABEL: Record<string, string> = {
  WEAPON_SWORD_ONE_HAND: "한손검",
  WEAPON_CLAYMORE: "양손검",
  WEAPON_POLE: "장병기",
  WEAPON_BOW: "활",
  WEAPON_CATALYST: "법구",
};

export function weaponLabel(type: string): string {
  return WEAPON_LABEL[type] ?? type;
}

export function elementFromGame(value: string | undefined | null): ElementKey {
  const v = (value ?? "").toLowerCase();
  if (v.includes("fire") || v.includes("pyro") || v === "불") return "pyro";
  if (v.includes("water") || v.includes("hydro") || v === "물") return "hydro";
  if (v.includes("electric") || v.includes("electro") || v === "번개") return "electro";
  if (v.includes("ice") || v.includes("cryo") || v === "얼음") return "cryo";
  if (v.includes("wind") || v.includes("anemo") || v === "바람") return "anemo";
  if (v.includes("rock") || v.includes("geo") || v === "바위") return "geo";
  if (v.includes("grass") || v.includes("dendro") || v === "풀") return "dendro";
  return "none";
}

export function elementDmgKey(element: ElementKey): StatKey | null {
  if (element === "none") return null;
  return element;
}

/** Classify a localized stat name from HoYoLAB or a FIGHT_PROP id from Enka. */
export function classifyStatName(raw: string): StatKey | null {
  const name = raw.replace(/\u00a0/g, " ").trim().toLowerCase();
  if (!name) return null;

  if (name.includes("fight_prop_critical_hurt") || name.includes("치명타 피해") || name.includes("crit dmg") || name.includes("critical damage") || name.includes("critical hurt")) return "cd";
  if (name.includes("fight_prop_critical") || name.includes("치명타 확률") || name.includes("crit rate") || name === "critical") return "cr";
  if (name.includes("charge_efficiency") || name.includes("원소 충전") || name.includes("energy recharge")) return "er";
  if (name.includes("element_mastery") || name.includes("원소 마스터리") || name.includes("elemental mastery")) return "em";
  if (name.includes("heal_add") || name.includes("치유") || name.includes("healing")) return "heal";
  if (name.includes("fire_add") || name.includes("불 원소") || name.includes("pyro")) return "pyro";
  if (name.includes("water_add") || name.includes("물 원소") || name.includes("hydro")) return "hydro";
  if (name.includes("elec_add") || name.includes("번개 원소") || name.includes("electro dmg") || name.includes("electro damage")) return "electro";
  if (name.includes("ice_add") || name.includes("얼음 원소") || name.includes("cryo")) return "cryo";
  if (name.includes("wind_add") || name.includes("바람 원소") || name.includes("anemo")) return "anemo";
  if (name.includes("rock_add") || name.includes("바위 원소") || name.includes("geo dmg") || name.includes("geo damage")) return "geo";
  if (name.includes("grass_add") || name.includes("풀 원소") || name.includes("dendro")) return "dendro";
  if (name.includes("physical") || name.includes("물리")) return "physical";

  const percent = name.includes("%") || name.includes("percent") || name.includes("백분");
  if (name.includes("hp") || name.includes("생명")) return percent ? "hp_" : "hp";
  if (name.includes("defense") || name.includes("def") || name.includes("방어")) return percent ? "def_" : "def";
  if (name.includes("attack") || name.includes("atk") || name.includes("공격")) return percent ? "atk_" : "atk";
  return null;
}

const PERCENT_KEYS = new Set<StatKey>([
  "hp_",
  "atk_",
  "def_",
  "er",
  "cr",
  "cd",
  "heal",
  "pyro",
  "hydro",
  "electro",
  "cryo",
  "anemo",
  "geo",
  "dendro",
  "physical",
]);

export function isPercentStat(key: StatKey): boolean {
  return PERCENT_KEYS.has(key);
}

export function formatStat(key: StatKey, value: number): string {
  if (key === "em" || key === "hp" || key === "atk" || key === "def") {
    return Math.round(value).toLocaleString("ko-KR");
  }
  const digits = Math.abs(value) >= 100 ? 1 : 1;
  return `${value.toFixed(digits)}%`;
}

export function parseNumber(raw: string | number | null | undefined): number {
  if (typeof raw === "number") return raw;
  if (!raw) return 0;
  const n = Number(String(raw).replace(/,/g, "").replace("%", "").trim());
  return Number.isFinite(n) ? n : 0;
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
