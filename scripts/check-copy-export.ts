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
assert.equal(all.count, 2); assert.equal(all.incompleteCount, 1);
assert.equal(all.characters[0].missing, undefined);
assert.deepEqual(all.characters[1].missing, ["stats", "weapon", "artifacts", "talents"]);
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
assert.deepEqual(Object.keys(one), ["id", "name", "element", "weaponType", "rarity", "level", "constellation", "talents", "stats", "weapon", "artifacts"]);
assert.deepEqual(Object.keys(one.artifacts[0]), ["slot", "set", "name", "rarity", "level", "mainStat", "substats"]);
console.log("copy-export whitelist: ok");
