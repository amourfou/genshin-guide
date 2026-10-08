import type { CombatStep } from "@/lib/combat";
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
  return `${(hash >>> 0).toString(16)}:${raw.length}`;
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
      ].join("\n")
    )
    .join("\n\n");
}

const MARKDOWN_LINK = /\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g;
const BARE_URL = /https?:\/\/[^\s)]+/g;

export function parseCombatAnswer(value: unknown): { steps: CombatStep[]; note: string; sources: string[] } | null {
  if (!value || typeof value !== "object") return null;
  const record = value as { steps?: unknown; note?: unknown };
  if (!Array.isArray(record.steps)) return null;
  const sources: string[] = [];
  const steps = record.steps.flatMap((step) => {
    if (!step || typeof step !== "object") return [];
    const title = clip(stripSources((step as { title?: unknown }).title, sources), 80);
    const detail = clip(stripSources((step as { detail?: unknown }).detail, sources), 220);
    if (!title || !detail) return [];
    return [{ title, detail }];
  });
  if (steps.length < 2 || steps.length > 8) return null;
  return { steps, note: clip(stripSources(record.note, sources), 180), sources };
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

export function answerMentionsParty(steps: CombatStep[], members: PartyCombatMember[]): boolean {
  const text = steps.map((step) => `${step.title} ${step.detail}`).join(" ");
  return members.every((member) => text.includes(member.name));
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
