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

export function characterExport(character: CharacterBuild) {
  return {
    id: character.id,
    name: character.name,
    element: character.element,
    weaponType: character.weaponType,
    rarity: character.rarity,
    level: character.level,
    constellation: character.constellation,
    friendship: character.friendship,
    talents: character.talents,
    stats: character.stats,
    weapon: character.weapon
      ? {
          name: character.weapon.name,
          rarity: character.weapon.rarity,
          level: character.weapon.level,
          refinement: character.weapon.refinement,
          mainStat: character.weapon.main,
          subStat: character.weapon.sub,
        }
      : null,
    artifacts: character.artifacts.map((artifact) => ({
      slot: artifact.slot,
      name: artifact.name,
      set: artifact.setName,
      rarity: artifact.rarity,
      level: artifact.level,
      mainStat: { key: artifact.main.key, value: artifact.main.value, display: artifact.main.display },
      substats: artifact.subs.map((sub) => ({ key: sub.key, value: sub.value, display: sub.display })),
    })),
    showcase: character.showcase,
    guide: {
      score: character.guide.score,
      role: character.guide.role,
      headline: character.guide.headline,
      checks: character.guide.checks,
      suggestions: character.guide.suggestions,
    },
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

export interface PartyExtra {
  name: string;
  resonances?: Array<{ title: string; detail: string }>;
  notes?: unknown;
}

export function partyJson(
  party: PartyExtra,
  members: Array<CharacterBuild | null>,
  profile?: ProfilePayload | null
): string {
  const data = {
    player: owner(profile),
    party: {
      name: party.name,
      elements: members.map((member) => member?.element ?? null),
      resonances: party.resonances ?? [],
      notes: party.notes ?? null,
      members: members.map((member, index) => ({ slot: index + 1, ...(member ? characterExport(member) : { empty: true }) })),
    },
  };
  return JSON.stringify(sanitize(data), null, 2);
}

/** Which detail sections a character is missing (e.g. no showcase stats). */
export function missingParts(character: CharacterBuild): string[] {
  const missing: string[] = [];
  if (!character.stats) missing.push("stats");
  if (!character.weapon) missing.push("weapon");
  if (!character.artifacts || character.artifacts.length === 0) missing.push("artifacts");
  if (!character.talents) missing.push("talents");
  return missing;
}

/** All owned characters in one JSON. Synchronous on purpose (iOS clipboard). */
export function allCharactersJson(characters: CharacterBuild[], profile?: ProfilePayload | null): string {
  const list = characters.map((character) => {
    const missing = missingParts(character);
    return { ...characterExport(character), ...(missing.length ? { missing } : {}) };
  });
  const data = {
    player: owner(profile),
    count: list.length,
    incompleteCount: list.filter((item) => "missing" in item).length,
    characters: list,
  };
  return JSON.stringify(sanitize(data), null, 2);
}
