import type { PartyGuide } from "@/lib/partyBrief";

export interface StoredGuideRow {
  brief_key: string;
  body: unknown;
  updated_at: string;
}

export interface GuideLookup {
  /** Saved answer for exactly this brief. */
  exact: PartyGuide | null;
  /** Newest answer for the same members whose details changed since. */
  previous: (PartyGuide & { savedAt: string }) | null;
}

/** Picks the exact match, or else the newest row for the same members. Rows may be in any order. */
export function chooseStoredGuide(
  rows: StoredGuideRow[],
  briefKey: string,
  parse: (value: unknown) => PartyGuide | null
): GuideLookup {
  let exact: PartyGuide | null = null;
  let previous: (PartyGuide & { savedAt: string }) | null = null;
  const sorted = [...rows].sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
  for (const row of sorted) {
    const guide = parse(row.body);
    if (!guide) continue;
    if (row.brief_key === briefKey) {
      if (!exact) exact = guide;
    } else if (!previous) {
      previous = { ...guide, savedAt: row.updated_at };
    }
  }
  return { exact, previous: exact ? null : previous };
}
