import type { CharacterBuild, ProfilePayload } from "./types";

/** Keys that may hold login secrets. Matched anywhere in a key name. */
export const SENSITIVE_KEY = /cookie|token|ltuid|ltoken|password|secret|auth/i;

/** Recursively drops any key that looks like a secret. Returns a new value. */
export function sanitize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY.test(key)) continue;
      if (typeof inner === "function" || inner === undefined) continue;
      out[key] = sanitize(inner);
    }
    return out;
  }
  return value;
}

/** Full English names for other LLMs. Percent values end in "Percent". */
export const STAT_NAME: Record<string, string> = {
  hp: "maxHp",
  hp_: "maxHpPercent",
  atk: "attack",
  atk_: "attackPercent",
  def: "defense",
  def_: "defensePercent",
  em: "elementalMastery",
  er: "energyRechargePercent",
  cr: "critRatePercent",
  cd: "critDamagePercent",
  heal: "healingBonusPercent",
  pyro: "pyroDamageBonusPercent",
  hydro: "hydroDamageBonusPercent",
  electro: "electroDamageBonusPercent",
  cryo: "cryoDamageBonusPercent",
  anemo: "anemoDamageBonusPercent",
  geo: "geoDamageBonusPercent",
  dendro: "dendroDamageBonusPercent",
  physical: "physicalDamageBonusPercent",
};

const FINAL_KEYS = ["hp", "atk", "def", "em", "er", "cr", "cd", "heal"] as const;

function finalStats(stats: CharacterBuild["stats"]) {
  if (!stats) return null;
  const out: Record<string, number> = {};
  for (const key of FINAL_KEYS) out[STAT_NAME[key]] = stats[key];
  for (const [key, value] of Object.entries(stats.dmg ?? {})) {
    if (typeof value === "number" && STAT_NAME[key]) out[STAT_NAME[key]] = value;
  }
  return out;
}

function statLine(line: { key: string; value: number }) {
  return { stat: STAT_NAME[line.key] ?? "unknown", value: line.value };
}

function numberOf(display: unknown): number | null {
  if (typeof display !== "string") return null;
  const n = Number(display.replace(/[,%\s]/g, ""));
  return display && Number.isFinite(n) ? n : null;
}

/**
 * Objective facts only, built field by field (whitelist), full English key names.
 * No app/AI judgement: no guide, score, role, checks, suggestions or showcase flag.
 */
export function characterExport(character: CharacterBuild) {
  return {
    characterId: character.id,
    name: character.name,
    element: character.element,
    weaponType: character.weaponType,
    rarity: character.rarity,
    level: character.level,
    constellation: character.constellation,
    talentLevels: character.talents
      ? {
          normalAttack: character.talents.normal,
          elementalSkill: character.talents.skill,
          elementalBurst: character.talents.burst,
        }
      : null,
    finalStats: finalStats(character.stats),
    weapon: character.weapon
      ? {
          name: character.weapon.name,
          rarity: character.weapon.rarity,
          level: character.weapon.level,
          refinement: character.weapon.refinement,
          baseAttack: numberOf(character.weapon.main),
          secondaryStatValue: typeof character.weapon.sub === "string" && character.weapon.sub ? character.weapon.sub : null,
        }
      : null,
    artifacts: character.artifacts.map((artifact) => ({
      slot: artifact.slot,
      setName: artifact.setName,
      name: artifact.name,
      rarity: artifact.rarity,
      level: artifact.level,
      mainStat: statLine(artifact.main),
      substats: artifact.subs.map(statLine),
    })),
  };
}

function owner(profile: ProfilePayload | null | undefined) {
  if (!profile) return null;
  return { uid: profile.uid, nickname: profile.player.nickname, server: profile.player.server, fetchedAt: profile.fetchedAt };
}

/** Pretty-printed (2-space) JSON for one character. Synchronous on purpose (iOS clipboard). */
export function characterJson(character: CharacterBuild, profile?: ProfilePayload | null): string {
  return JSON.stringify(sanitize({ player: owner(profile), character: characterExport(character) }), null, 2);
}

/** Party members' objective facts only. No resonance text, warnings, advice or AI answer. */
export function partyJson(partyName: string, members: Array<CharacterBuild | null>, profile?: ProfilePayload | null): string {
  const data = {
    player: owner(profile),
    party: {
      name: partyName,
      members: members.map((member, index) => ({ slotNumber: index + 1, ...(member ? characterExport(member) : { emptySlot: true }) })),
    },
  };
  return JSON.stringify(sanitize(data), null, 2);
}

/** Which detail sections a character is missing (e.g. no showcase stats). */
export function missingParts(character: CharacterBuild): string[] {
  const missing: string[] = [];
  if (!character.stats) missing.push("finalStats");
  if (!character.weapon) missing.push("weapon");
  if (!character.artifacts || character.artifacts.length === 0) missing.push("artifacts");
  if (!character.talents) missing.push("talentLevels");
  return missing;
}

/** All owned characters in one JSON. Synchronous on purpose (iOS clipboard). */
export function allCharactersJson(characters: CharacterBuild[], profile?: ProfilePayload | null): string {
  const list = characters.map((character) => {
    const missing = missingParts(character);
    return { ...characterExport(character), ...(missing.length ? { missingSections: missing } : {}) };
  });
  const data = {
    player: owner(profile),
    characterCount: list.length,
    incompleteCharacterCount: list.filter((item) => "missingSections" in item).length,
    characters: list,
  };
  return JSON.stringify(sanitize(data), null, 2);
}
