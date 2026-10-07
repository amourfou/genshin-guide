import catalogJson from "@/data/enka-characters.json";
import { NAMES_KO } from "@/lib/names";
import { elementFromGame } from "@/lib/stats";
import type { ElementKey } from "@/lib/types";

interface CatalogEntry {
  element: string;
  weapon?: string;
  quality: string;
  side: string;
  talents: { normal: number | null; skill: number | null; burst: number | null };
}

const catalog = catalogJson as unknown as Record<string, CatalogEntry>;

export function lookupCatalog(avatarId: number, skillDepotId?: number): CatalogEntry | null {
  if (skillDepotId) {
    const variant = catalog[`${avatarId}-${skillDepotId}`];
    if (variant) return variant;
  }
  return catalog[String(avatarId)] ?? null;
}

export function rarityFromQuality(quality: string | undefined): number {
  if (!quality) return 4;
  if (quality.includes("ORANGE")) return 5;
  if (quality.includes("PURPLE")) return 4;
  return 4;
}

export function characterName(avatarId: number, fallback?: string): string {
  return NAMES_KO[avatarId] || fallback || `캐릭터 ${avatarId}`;
}

export function prettySideName(side: string | undefined): string {
  if (!side) return "";
  return side
    .replace(/^UI_AvatarIcon_Side_/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2");
}

export function catalogElement(entry: CatalogEntry | null): ElementKey {
  return elementFromGame(entry?.element);
}

export function iconFromSide(side: string | undefined): string {
  if (!side) return "";
  const face = side.replace("_Side", "");
  return `https://enka.network/ui/${face}.png`;
}
