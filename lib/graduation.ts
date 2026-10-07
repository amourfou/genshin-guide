import { LOCAL_GUIDES } from "@/lib/guides";
import type { CombatStats, GuideTemplate, StatKey } from "@/lib/types";

export type MarkStatus = "before" | "semi" | "grad";

export interface StatMark {
  key: StatKey;
  value: number;
  semi: number;
  grad: number;
  max: number;
  percent: boolean;
  status: MarkStatus;
}

const FORGIVE = ["blizzard", "얼음바람", "marechaussee", "그림자 사냥", "obsidian", "흑요석"];

function statusOf(value: number, semi: number, grad: number): MarkStatus {
  if (value + 0.05 >= grad) return "grad";
  if (value + 0.05 >= semi) return "semi";
  return "before";
}

function mark(
  key: StatKey,
  value: number,
  semi: number,
  grad: number,
  ceiling: number,
  percent: boolean
): StatMark {
  const max = Math.max(ceiling, grad, semi, value, 1);
  return { key, value, semi, grad, max, percent, status: statusOf(value, semi, grad) };
}

function forgivesCrit(guide: GuideTemplate): boolean {
  return guide.sets.some((option) => option.aliases.some((alias) => FORGIVE.includes(alias)));
}

/** Sheet-stat lines used by Korean build talk: 준졸업, then 졸업. */
export function graduationMarks(id: number, stats: CombatStats): StatMark[] {
  const guide = LOCAL_GUIDES[id] ?? null;
  const scaling = guide?.scaling ?? "atk";
  const erMin = guide?.erMin ?? 120;
  const circlet = guide?.circlet ?? ["cr", "cd"];
  const sands = guide?.sands ?? ["atk_"];
  const role = guide?.role ?? "딜러";
  const wantsCrit =
    scaling !== "heal" &&
    scaling !== "em" &&
    (circlet[0] === "cr" || circlet[0] === "cd");
  const marks: StatMark[] = [];

  if (scaling === "hp" || (scaling === "heal" && (sands.includes("hp_") || guide?.goblet.includes("hp_")))) {
    const shield = role === "실더";
    marks.push(mark("hp", stats.hp, shield ? 35000 : 30000, shield ? 45000 : 38000, shield ? 55000 : 48000, false));
  } else if (scaling === "def") {
    marks.push(mark("def", stats.def, 1800, 2400, 3200, false));
  } else if (scaling === "em") {
    marks.push(mark("em", stats.em, 600, 800, 1200, false));
  } else if (scaling === "atk") {
    const rechargeSands = sands[0] === "er" || erMin >= 180;
    marks.push(
      mark("atk", stats.atk, rechargeSands ? 1500 : 1800, rechargeSands ? 1900 : 2200, rechargeSands ? 2600 : 3000, false)
    );
  }

  if (scaling === "heal") {
    marks.push(mark("heal", stats.heal, 20, 35, 60, true));
  }

  if (wantsCrit) {
    const forgiven = guide ? forgivesCrit(guide) : false;
    marks.push(
      mark("cr", stats.cr, forgiven ? 35 : 60, forgiven ? 50 : 70, 100, true),
      mark("cd", stats.cd, forgiven ? 150 : 120, forgiven ? 200 : 150, forgiven ? 280 : 220, true)
    );
  }

  marks.push(mark("er", stats.er, Math.max(100, erMin - 20), erMin, Math.max(erMin + 40, erMin * 1.35), true));
  return marks;
}
