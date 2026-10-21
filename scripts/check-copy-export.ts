import assert from "node:assert/strict";
import { sanitize } from "../lib/copyExport";
const input = { uid: "800000000", ltuid_v2: "x", nested: { ltoken: "x", cookie_token: "x", Authorization: "x", keep: 1, list: [{ password: "x", clientSecret: "x", ok: true }] } };
const out = sanitize(input) as any;
assert.deepEqual(out, { uid: "800000000", nested: { keep: 1, list: [{ ok: true }] } });
console.log("copy-export sanitize: ok");
import { allCharactersJson } from "../lib/copyExport";
const base: any = { id: 1, name: "A", element: "pyro", weaponType: "sword", rarity: 5, level: 90, friendship: 10, constellation: 2, icon: "", talents: { a: 1 }, stats: { hp: 1 }, weapon: { name: "W", rarity: 5, level: 90, refinement: 1, main: {}, sub: null }, artifacts: [{ slot: "flower", name: "f", setName: "s", rarity: 5, level: 20, main: { key: "hp", value: 1, display: "1" }, subs: [] }], showcase: true, guide: { score: 1, role: "dps", headline: "", checks: [], suggestions: [] } };
const bare: any = { ...base, id: 2, talents: null, stats: null, weapon: null, artifacts: [], showcase: false };
const all = JSON.parse(allCharactersJson([base, bare], { uid: "8", player: { nickname: "n", server: "s" }, fetchedAt: "t", cookie: "SECRET" } as any));
assert.equal(all.characterCount, 2); assert.equal(all.incompleteCharacterCount, 1);
assert.equal(all.characters[0].missingSections, undefined);
assert.deepEqual(all.characters[1].missingSections, ["finalStats", "weapon", "artifacts", "talentLevels"]);
assert.ok(!JSON.stringify(all).includes("SECRET"));
console.log("copy-export all: ok");
import { characterJson, partyJson } from "../lib/copyExport";
const FORBIDDEN = /^(guide|score|role|roleHint|checks|suggestions|detail|headline|advice|notes|misfits|resonances|showcase|friendship|targets|grad|semi|status|cookie|token|ltoken|ltuid)$/i;
function keysOf(v: unknown, acc: string[] = []): string[] {
  if (Array.isArray(v)) v.forEach((x) => keysOf(x, acc));
  else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) { acc.push(k); keysOf(x, acc); }
  return acc;
}
const prof: any = { uid: "8", player: { nickname: "n", server: "s" }, fetchedAt: "t", cookie: "SECRET" };
const rich: any = { ...base, guide: { score: 9, role: "dps", headline: "h", checks: [{ detail: "d" }], suggestions: ["s"] }, stats: { hp: 1, atk: 2, def: 3, em: 4, er: 5, cr: 6, cd: 7, heal: 0, dmg: { pyro: 1 }, extraJudge: "x" } };
for (const text of [characterJson(rich, prof), partyJson("p", [rich, null], prof), allCharactersJson([rich, bare], prof)]) {
  const bad = keysOf(JSON.parse(text)).filter((k) => FORBIDDEN.test(k));
  assert.deepEqual(bad, [], `forbidden keys: ${bad}`);
  assert.ok(!text.includes("SECRET") && !text.includes("extraJudge") && !text.includes("suggestions"));
}
const one = JSON.parse(characterJson(rich, prof)).character;
assert.deepEqual(Object.keys(one), ["characterId", "name", "element", "weaponType", "rarity", "level", "constellation", "talentLevels", "finalStats", "weapon", "artifacts"]);
assert.deepEqual(Object.keys(one.artifacts[0]), ["slot", "setName", "name", "rarity", "level", "mainStat", "substats"]);
console.log("copy-export whitelist: ok");
const ABBREV = /^(hp|hp_|atk|atk_|def|def_|em|er|cr|cd|heal|dmg|id|stats|talents|set|sub|main|subStat|mainStat_|normal|skill|burst|count|missing|slot_|empty|pyro|hydro|electro|cryo|anemo|geo|dendro|physical)$/;
const shortRich: any = { ...rich, artifacts: [{ ...base.artifacts[0], main: { key: "cr", value: 31.1, display: "31.1%" }, subs: [{ key: "atk_", value: 5.8, display: "5.8%" }, { key: "em", value: 23, display: "23" }] }] };
const allText = [characterJson(shortRich, prof), partyJson("p", [shortRich, null], prof), allCharactersJson([shortRich, bare], prof)];
for (const text of allText) {
  const parsed = JSON.parse(text);
  const shortKeys = keysOf(parsed).filter((k) => ABBREV.test(k));
  assert.deepEqual(shortKeys, [], `abbreviated keys: ${shortKeys}`);
  const statNames = JSON.stringify(parsed).match(/"stat":"([^"]+)"/g) ?? [];
  for (const n of statNames) assert.ok(!/"stat":"(hp_?|atk_?|def_?|em|er|cr|cd|unknown)"/.test(n), n);
}
const c = JSON.parse(allText[0]).character;
assert.equal(c.finalStats.critRatePercent, 6); assert.equal(c.finalStats.pyroDamageBonusPercent, 1); assert.equal(c.finalStats.maxHp, 1);
assert.deepEqual(c.artifacts[0].mainStat, { stat: "critRatePercent", value: 31.1 });
assert.deepEqual(c.artifacts[0].substats, [{ stat: "attackPercent", value: 5.8 }, { stat: "elementalMastery", value: 23 }]);
const keySet = new Set<string>(); for (const t of allText) keysOf(JSON.parse(t)).forEach((k) => keySet.add(k));
console.log("copy-export full names: ok");
console.log("KEYS", [...keySet].sort().join(","));
