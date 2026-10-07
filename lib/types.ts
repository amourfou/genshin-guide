export type ElementKey =
  | "pyro"
  | "hydro"
  | "electro"
  | "cryo"
  | "anemo"
  | "geo"
  | "dendro"
  | "none";

export type StatKey =
  | "hp"
  | "hp_"
  | "atk"
  | "atk_"
  | "def"
  | "def_"
  | "em"
  | "er"
  | "cr"
  | "cd"
  | "heal"
  | "pyro"
  | "hydro"
  | "electro"
  | "cryo"
  | "anemo"
  | "geo"
  | "dendro"
  | "physical";

export type ArtifactSlot = "flower" | "plume" | "sands" | "goblet" | "circlet";

export type Scaling = "atk" | "hp" | "def" | "em" | "heal";

export type TalentFocus = "normal" | "skill" | "burst";

export interface StatLine {
  key: StatKey;
  value: number;
  display: string;
}

export interface WeaponInfo {
  id: number;
  name: string;
  rarity: number;
  level: number;
  refinement: number;
  icon: string;
  main: string;
  sub: string;
}

export interface ArtifactInfo {
  slot: ArtifactSlot;
  name: string;
  setName: string;
  rarity: number;
  level: number;
  icon: string;
  main: StatLine;
  subs: StatLine[];
}

export interface TalentInfo {
  normal: number;
  skill: number;
  burst: number;
}

export interface CombatStats {
  hp: number;
  atk: number;
  def: number;
  em: number;
  er: number;
  cr: number;
  cd: number;
  heal: number;
  dmg: Partial<Record<ElementKey | "physical", number>>;
}

export interface GuideCheck {
  ok: boolean;
  label: string;
  detail: string;
}

export interface GuideReport {
  score: number;
  headline: string;
  role: string;
  known: boolean;
  checks: GuideCheck[];
  suggestions: string[];
  teamNote: string;
  weaponNote: string;
}

export interface CharacterBuild {
  id: number;
  name: string;
  element: ElementKey;
  weaponType: string;
  rarity: number;
  level: number;
  friendship: number;
  constellation: number;
  icon: string;
  talents: TalentInfo | null;
  stats: CombatStats | null;
  weapon: WeaponInfo | null;
  artifacts: ArtifactInfo[];
  showcase: boolean;
  guide: GuideReport;
}

export interface PartyMember {
  id: number;
  name: string;
  icon: string;
  level: number;
  element: ElementKey | null;
}

export interface PartySnapshot {
  source: string;
  characters: PartyMember[];
}

export interface PlayerSummary {
  nickname: string;
  adventureRank: number | null;
  worldLevel: number | null;
  signature: string;
  achievements: number | null;
  abyss: string;
  characterCount: number | null;
  server: string;
}

export interface ProfilePayload {
  uid: string;
  player: PlayerSummary;
  characters: CharacterBuild[];
  abyss: PartySnapshot[];
  theater: PartySnapshot[];
  warnings: string[];
  fetchedAt: string;
  usedHoyolab: boolean;
  usedEnka: boolean;
}

export interface GuideSetOption {
  pieces: 2 | 4;
  aliases: string[];
}

export interface GuideTemplate {
  id: number;
  role: string;
  scaling: Scaling;
  sands: StatKey[];
  goblet: StatKey[];
  circlet: StatKey[];
  sets: GuideSetOption[];
  setNote: string;
  substats: string;
  erMin: number;
  erNote: string;
  talentFocus: TalentFocus;
  talentNote: string;
  weaponNote: string;
  teamNote: string;
}
