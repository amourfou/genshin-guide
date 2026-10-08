import type { CombatStep } from "@/lib/combat";
import { graduationMarks } from "@/lib/graduation";
import { ELEMENT_LABEL, STAT_LABEL, formatStat } from "@/lib/stats";
import type { ArtifactInfo, CharacterBuild, CombatStats, StatKey } from "@/lib/types";

export interface PartyCombatMember {
  name: string;
  element: string;
  level: number;
  constellation: number;
  roleHint: string;
  talents: string;
  weapon: string;
  artifacts: string;
  stats: string;
  targets: string;
}

export interface PartyGuideSwap {
  out: string;
  inn: string;
  reason: string;
}

export interface PartyGuideGear {
  name: string;
  item: string;
  now: string;
  goal: string;
  reason: string;
}

export interface PartyGuideSlot {
  name: string;
  role: string;
  state: "유지" | "추가";
}

export interface PartyGuide {
  gaps: string[];
  swaps: PartyGuideSwap[];
  gear: PartyGuideGear[];
  lineup: PartyGuideSlot[];
  steps: CombatStep[];
  note: string;
  sources: string[];
}

const PIECE_LABEL: Record<"sands" | "goblet" | "circlet", string> = {
  sands: "모래",
  goblet: "잔",
  circlet: "모자",
};

export function partyCombatBrief(members: Array<CharacterBuild | null>): PartyCombatMember[] {
  return members.flatMap((member) => (member ? [briefOf(member)] : []));
}

export function partyBriefKey(members: PartyCombatMember[]): string {
  const raw = JSON.stringify(members);
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `3:${(hash >>> 0).toString(16)}:${raw.length}`;
}

export function combatBriefText(members: PartyCombatMember[]): string {
  return members
    .map((member, index) =>
      [
        `${index + 1}. ${member.name}`,
        `원소 ${member.element}, ${member.level}레벨, ${member.constellation}돌, 역할 힌트 ${member.roleHint}`,
        `특성 ${member.talents}`,
        `무기 ${member.weapon}`,
        `성유물 ${member.artifacts}`,
        `스탯 ${member.stats}`,
        `기준 ${member.targets}`,
      ].join("\n")
    )
    .join("\n\n") + starTeamNote(members);
}

const CRYO_TRAVELER = /여행자|아이테르|루미네/;

export function starTeamNote(members: PartyCombatMember[]): string {
  const cryoTraveler = members.find((member) => member.element === "얼음" && CRYO_TRAVELER.test(member.name));
  const vesna = members.some((member) => member.name.includes("베스나"));
  const mizuki = members.some((member) => member.name.includes("미즈키"));
  const lines: string[] = [];
  if (vesna) {
    lines.push("확인된 사실: 베스나는 바람 원소 별확산 딜러다. 물이 아니다. 보댜니차와 다른 캐릭터다. 물 캐릭터로 바꾸거나 빼지 않는다.");
  }
  if (cryoTraveler) {
    lines.push(`확인된 사실: ${cryoTraveler.name}는 얼음 여행자다. 이 캐릭터가 파티의 얼음 확산을 별확산으로, 초전도를 별초전도로 바꾼다. 물을 넣으려고 빼지 않는다.`);
  }
  if (cryoTraveler && (vesna || mizuki)) {
    lines.push("확인된 사실: 이 파티는 별확산 파티다. 얼음을 먼저 묻히고 바람이 확산하면 별확산이 된다. 물은 조건이 아니다. 설탕은 원소 마스터리, 디오나는 보호막과 얼음 부착이라 맞다. 디오나 보호막은 원소전투 홀드다. 지금 멤버를 유지하고 swaps는 빈 배열로 둔다.");
  }
  return lines.length ? `\n\n${lines.join("\n")}` : "";
}

export function keepStarTeam(guide: PartyGuide, members: PartyCombatMember[]): PartyGuide {
  const cryoTraveler = members.find((member) => member.element === "얼음" && CRYO_TRAVELER.test(member.name));
  const driver = members.some((member) => member.name.includes("베스나") || member.name.includes("미즈키"));
  if (!cryoTraveler || !driver) return guide;
  const names = members.map((member) => member.name);
  const lineup = names.slice(0, 4).map((name) => {
    const existing = guide.lineup.find((slot) => slot.name === name);
    const role = existing?.role || (name.includes("베스나") || name.includes("미즈키") ? "별확산" : name === cryoTraveler.name ? "별 변환" : "지원");
    return { name, role, state: "유지" as const };
  });
  const gaps = guide.gaps.filter((gap) => !mentionsHydroSwap(gap) && !names.some((name) => gap.includes(name) && /바꾸|빼|교체/.test(gap)));
  return {
    ...guide,
    swaps: [],
    lineup,
    gaps: gaps.length > 0 ? gaps : ["큰 구멍은 없습니다. 별확산이라 물이 필요하지 않습니다."],
    note: mentionsHydroSwap(guide.note) ? "" : guide.note,
  };
}

function mentionsHydroSwap(text: string): boolean {
  return /물로 바꾸|물을 넣|물 캐릭|물 원소|물이 필요|물이 없|하이드로|빙결/.test(text);
}

const TALENT_FIELDS = [
  { key: "normal" as const, word: /평타|일반\s*공격/, brief: /평타\s*(\d+)/ },
  { key: "skill" as const, word: /원소\s*전투/, brief: /원소전투\s*(\d+)/ },
  { key: "burst" as const, word: /원소\s*폭발/, brief: /원소폭발\s*(\d+)/ },
];

function talentLevels(text: string): Record<"normal" | "skill" | "burst", number> | null {
  const levels = { normal: 0, skill: 0, burst: 0 };
  let found = false;
  for (const field of TALENT_FIELDS) {
    const match = field.brief.exec(text);
    if (!match) continue;
    levels[field.key] = Number(match[1]);
    found = true;
  }
  return found ? levels : null;
}

function rewriteTalentNumbers(text: string, name: string, levels: Record<"normal" | "skill" | "burst", number>): string {
  if (!text.includes(name)) return text;
  let next = text;
  for (const field of TALENT_FIELDS) {
    next = next.replace(new RegExp(`(${field.word.source})([^\\d]{0,12}?)(\\d+)`, "g"), (all, word, mid, raw) => {
      const level = Number(raw);
      const actual = levels[field.key];
      if (actual > 0 && level > 0 && level < actual) return `${word}${mid}${actual}`;
      return all;
    });
  }
  return next;
}

function falseTalentRaise(text: string, name: string, levels: Record<"normal" | "skill" | "burst", number>): boolean {
  if (!text.includes(name) || !/올리|올려/.test(text)) return false;
  if (/충전|치명|공격력|생명|방어|마스터리|성유물|무기|재련|세트/.test(text)) return false;
  return TALENT_FIELDS.some((field) => {
    if (!field.word.test(text) || levels[field.key] <= 0) return false;
    const nums = [...text.matchAll(/\d+/g)].map((match) => Number(match[0]));
    return nums.length > 0 && nums.every((level) => level <= levels[field.key]);
  });
}

export function keepTalentFacts(guide: PartyGuide, members: PartyCombatMember[]): PartyGuide {
  const known = members.flatMap((member) => {
    const levels = talentLevels(member.talents);
    return levels ? [{ name: member.name, levels }] : [];
  });
  if (known.length === 0) return guide;
  const rewrite = (text: string) => known.reduce((next, member) => rewriteTalentNumbers(next, member.name, member.levels), text);
  const dropRaise = (text: string) => known.some((member) => falseTalentRaise(text, member.name, member.levels));
  const gaps = guide.gaps.map(rewrite).filter((gap) => gap && !dropRaise(gap));
  const gear = guide.gear.flatMap((item) => {
    const owner = known.find((member) => member.name === item.name) ?? known.find((member) => item.name.includes(member.name));
    if (!owner) return [item];
    const field = TALENT_FIELDS.find((entry) => entry.word.test(item.item));
    if (!field || owner.levels[field.key] <= 0) return [item];
    const actual = owner.levels[field.key];
    const goal = /(\d+)/.exec(item.goal);
    if (goal && Number(goal[1]) <= actual) return [];
    return [{ ...item, now: String(actual), reason: rewrite(item.reason) }];
  });
  return {
    ...guide,
    gaps: gaps.length > 0 ? gaps : ["큰 구멍은 없습니다"],
    gear,
    swaps: guide.swaps.map((swap) => ({ ...swap, reason: rewrite(swap.reason) })),
    note: dropRaise(rewrite(guide.note)) ? "" : rewrite(guide.note),
  };
}

const MARKDOWN_LINK = /\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g;
const BARE_URL = /https?:\/\/[^\s)]+/g;

export function parseCombatAnswer(value: unknown): PartyGuide | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const sources: string[] = [];
  const gaps = strings(record.gaps, 4, 110, sources);
  const swaps = rows(record.swaps, 3, (row) => {
    const out = field(row, "out", 24, sources);
    const inn = field(row, "inn", 24, sources);
    const reason = field(row, "reason", 110, sources);
    if (!out || !inn || !reason) return null;
    return { out, inn, reason };
  });
  const gear = rows(record.gear, 6, (row) => {
    const name = field(row, "name", 24, sources);
    const item = field(row, "item", 24, sources);
    const now = field(row, "now", 28, sources);
    const goal = field(row, "goal", 32, sources);
    const reason = field(row, "reason", 90, sources);
    if (!name || !item || !now || !goal || !reason) return null;
    return { name, item, now, goal, reason };
  });
  const lineup = rows(record.lineup, 4, (row) => {
    const name = field(row, "name", 24, sources);
    const role = field(row, "role", 36, sources);
    if (!name || !role) return null;
    const state = field(row, "state", 8, sources) === "유지" ? "유지" : "추가";
    return { name, role, state } as PartyGuideSlot;
  });
  const steps = rows(record.steps, 8, (row) => {
    const title = field(row, "title", 56, sources);
    const detail = field(row, "detail", 140, sources);
    if (!title || !detail) return null;
    return { title, detail };
  });
  if (gaps.length < 1 || lineup.length < 2 || steps.length < 2) return null;
  return { gaps, swaps, gear, lineup, steps, note: field(record, "note", 140, sources), sources };
}

function strings(value: unknown, max: number, length: number, sources: string[]): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, max)
    .map((item) => clip(stripSources(item, sources), length))
    .filter((item) => item.length > 0);
}

function rows<T>(value: unknown, max: number, map: (row: Record<string, unknown>) => T | null): T[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, max).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const mapped = map(item as Record<string, unknown>);
    return mapped ? [mapped] : [];
  });
}

function field(row: Record<string, unknown>, key: string, max: number, sources: string[]): string {
  return clip(stripSources(row[key], sources), max);
}

function stripSources(value: unknown, sources: string[]): string {
  if (typeof value !== "string") return "";
  const withoutLinks = value.replace(MARKDOWN_LINK, (_all, _label: string, url: string) => {
    pushSource(sources, url);
    return " ";
  });
  return withoutLinks
    .replace(BARE_URL, (url) => {
      pushSource(sources, url);
      return " ";
    })
    .replace(/\s*\(\[[^\]]*\]\([^)]*\)?/g, " ")
    .replace(/\(\s*\)/g, " ")
    .replace(/\s+([.,!?])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function pushSource(sources: string[], raw: string) {
  if (sources.length >= 4) return;
  const href = cleanSourceUrl(raw);
  if (!href || sources.includes(href)) return;
  sources.push(href);
}

function cleanSourceUrl(raw: string): string {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || !url.hostname.includes(".")) return "";
    for (const key of [...url.searchParams.keys()]) {
      if (key.startsWith("utm_")) url.searchParams.delete(key);
    }
    url.hash = "";
    return url.toString();
  } catch {
    return "";
  }
}

export function answerCoversParty(guide: PartyGuide, members: PartyCombatMember[]): boolean {
  const text = [
    ...guide.gaps,
    ...guide.swaps.flatMap((swap) => [swap.out, swap.inn, swap.reason]),
    ...guide.gear.flatMap((item) => [item.name, item.item, item.now, item.goal, item.reason]),
    ...guide.lineup.map((slot) => slot.name),
    ...guide.steps.flatMap((step) => [step.title, step.detail]),
    guide.note,
  ].join(" ");
  const presses = guide.steps.map((step) => `${step.title} ${step.detail}`).join(" ");
  return members.every((member) => text.includes(member.name)) && guide.lineup.every((slot) => presses.includes(slot.name));
}

function briefOf(member: CharacterBuild): PartyCombatMember {
  return {
    name: member.name,
    element: ELEMENT_LABEL[member.element] ?? member.element,
    level: member.level,
    constellation: member.constellation,
    roleHint: member.guide.role || "미정",
    talents: member.talents
      ? `평타 ${member.talents.normal} · 원소전투 ${member.talents.skill} · 원소폭발 ${member.talents.burst}`
      : "특성 정보 없음",
    weapon: member.weapon
      ? `${member.weapon.name} 재련 ${member.weapon.refinement} ${member.weapon.level}레벨`
      : "무기 정보 없음",
    artifacts: artifactText(member.artifacts),
    stats: member.stats ? statText(member.stats) : "스탯 없음",
    targets: member.stats ? targetText(member.id, member.stats) : "기준 없음",
  };
}

function artifactText(artifacts: ArtifactInfo[]): string {
  if (artifacts.length === 0) return "성유물 없음";
  const counts = new Map<string, number>();
  for (const piece of artifacts) {
    const name = piece.setName || "세트 없음";
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  const sets = [...counts.entries()].map(([name, count]) => `${name} ${count}`);
  const mains = artifacts.flatMap((piece) => {
    if (piece.slot !== "sands" && piece.slot !== "goblet" && piece.slot !== "circlet") return [];
    const main = piece.main.display || `${STAT_LABEL[piece.main.key]} ${formatStat(piece.main.key, piece.main.value)}`;
    return [`${PIECE_LABEL[piece.slot]} ${main}`];
  });
  return [...sets, ...mains].join(", ");
}

function targetText(id: number, stats: CombatStats): string {
  return graduationMarks(id, stats)
    .map((mark) => {
      const state = mark.status === "grad" ? "졸업" : mark.status === "semi" ? "준졸업" : "미달";
      return `${STAT_LABEL[mark.key]} 준졸업 ${formatStat(mark.key, mark.semi)} 졸업 ${formatStat(mark.key, mark.grad)} ${state}`;
    })
    .join(", ");
}

function statText(stats: CombatStats): string {
  const parts = [
    `생명 ${formatStat("hp", stats.hp)}`,
    `공격 ${formatStat("atk", stats.atk)}`,
    `방어 ${formatStat("def", stats.def)}`,
    `원마 ${formatStat("em", stats.em)}`,
    `충효 ${formatStat("er", stats.er)}`,
    `치확 ${formatStat("cr", stats.cr)}`,
    `치피 ${formatStat("cd", stats.cd)}`,
  ];
  if (stats.heal > 0) parts.push(`치유 ${formatStat("heal", stats.heal)}`);
  for (const [key, value] of Object.entries(stats.dmg) as Array<[StatKey, number | undefined]>) {
    if (!value) continue;
    parts.push(`${STAT_LABEL[key] ?? key} ${formatStat(key, value)}`);
  }
  return parts.join(", ");
}

function clip(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}
