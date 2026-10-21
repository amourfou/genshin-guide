import assert from "node:assert/strict";
import { partyBriefKey, partyMemberKey, statBandText, type PartyCombatMember } from "../lib/partyBrief";
import { chooseStoredGuide } from "../lib/partyGuideLookup";

const m = (id: number, extra: Partial<PartyCombatMember> = {}): PartyCombatMember => ({
  id, name: `c${id}`, element: "불", level: 90, constellation: 0, roleHint: "딜러", talents: "평타 9", weapon: "W", artifacts: "S 4",
  stats: "생명 20,000", targets: "x", statBand: statBandText({ hp: 20010, atk: 2000, def: 800, em: 100, er: 120.3, cr: 70.1, cd: 140.2, heal: 0, dmg: { pyro: 46.6 } }), ...extra,
});
const base = [m(3), m(1), m(2)];
const key = partyBriefKey(base);
// order
assert.equal(partyBriefKey([m(1), m(2), m(3)]), key);
assert.equal(partyMemberKey(base), "1-2-3");
// volatile values excluded
assert.equal(partyBriefKey([m(3, { roleHint: "서포터", stats: "생명 20,011", targets: "y" }), m(1), m(2)]), key);
// tiny stat drift stays in band
const drift = statBandText({ hp: 20090, atk: 2010, def: 805, em: 104, er: 121.0, cr: 70.9, cd: 141.1, heal: 0, dmg: { pyro: 46.6 } });
assert.equal(partyBriefKey([m(3, { statBand: drift }), m(1), m(2)]), key);
// real changes do change the key
assert.notEqual(partyBriefKey([m(3, { level: 80 }), m(1), m(2)]), key);
assert.notEqual(partyBriefKey([m(3, { artifacts: "T 4" }), m(1), m(2)]), key);
assert.notEqual(partyBriefKey([m(3, { statBand: statBandText({ hp: 20010, atk: 2000, def: 800, em: 100, er: 120, cr: 80, cd: 140, heal: 0, dmg: {} }) }), m(1), m(2)]), key);
console.log("party key: ok");

const parse = (v: unknown) => (v && typeof v === "object" ? ({ ...(v as object), sources: [] } as any) : null);
const rows = [
  { brief_key: "old", body: { n: "old" }, updated_at: "2026-10-01T00:00:00Z" },
  { brief_key: "newer", body: { n: "newer" }, updated_at: "2026-10-10T00:00:00Z" },
  { brief_key: "bad", body: null, updated_at: "2026-10-20T00:00:00Z" },
];
let r = chooseStoredGuide(rows, "old", parse);
assert.equal((r.exact as any).n, "old"); assert.equal(r.previous, null);
r = chooseStoredGuide(rows, "none", parse);
assert.equal(r.exact, null); assert.equal((r.previous as any).n, "newer"); assert.equal(r.previous?.savedAt, "2026-10-10T00:00:00Z");
assert.deepEqual(chooseStoredGuide([], "x", parse), { exact: null, previous: null });
console.log("party lookup: ok");
