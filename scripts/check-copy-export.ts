import assert from "node:assert/strict";
import { sanitize } from "../lib/copyExport";
const input = { uid: "800000000", ltuid_v2: "x", nested: { ltoken: "x", cookie_token: "x", Authorization: "x", keep: 1, list: [{ password: "x", clientSecret: "x", ok: true }] } };
const out = sanitize(input) as any;
assert.deepEqual(out, { uid: "800000000", nested: { keep: 1, list: [{ ok: true }] } });
console.log("copy-export sanitize: ok");
