import type { CharacterBuild } from "@/lib/types";

/** Highest level first. Same level keeps the stronger build ahead. */
export function compareByLevel(a: CharacterBuild, b: CharacterBuild): number {
  return b.level - a.level || b.guide.score - a.guide.score || b.rarity - a.rarity;
}
