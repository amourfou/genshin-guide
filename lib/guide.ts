import { LOCAL_GUIDES } from "@/lib/guides";
import { elementDmgKey, STAT_LABEL } from "@/lib/stats";
import type {
  ArtifactInfo,
  ArtifactSlot,
  CharacterBuild,
  GuideCheck,
  GuideReport,
  GuideTemplate,
  StatKey,
  TalentFocus,
} from "@/lib/types";

const SLOT_LABEL: Record<ArtifactSlot, string> = {
  flower: "꽃",
  plume: "깃털",
  sands: "모래시계",
  goblet: "성배",
  circlet: "왕관",
};

export function templateFor(
  id: number,
  guides: Record<number, GuideTemplate> = LOCAL_GUIDES
): GuideTemplate | null {
  return guides[id] ?? null;
}

function piece(artifacts: ArtifactInfo[], slot: ArtifactSlot): ArtifactInfo | undefined {
  return artifacts.find((item) => item.slot === slot);
}

function labels(keys: StatKey[]): string {
  return keys.map((key) => STAT_LABEL[key]).join(" · ");
}

function setMatch(artifacts: ArtifactInfo[], aliases: string[], pieces: number): string | null {
  const counts = new Map<string, number>();
  for (const artifact of artifacts) {
    const name = artifact.setName.trim();
    if (!name) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  for (const [name, count] of counts) {
    const lower = name.toLowerCase();
    if (count >= pieces && aliases.some((alias) => lower.includes(alias.toLowerCase()))) {
      return `${name} ${count}개`;
    }
  }
  return null;
}

function equippedSets(artifacts: ArtifactInfo[]): string {
  const counts = new Map<string, number>();
  for (const artifact of artifacts) {
    if (!artifact.setName) continue;
    counts.set(artifact.setName, (counts.get(artifact.setName) ?? 0) + 1);
  }
  if (counts.size === 0) return "성유물 없음";
  return [...counts.entries()].map(([name, count]) => `${name} ${count}`).join(", ");
}

function talentLevel(
  talents: CharacterBuild["talents"],
  focus: TalentFocus
): number | null {
  if (!talents) return null;
  const level = talents[focus];
  return level > 0 ? level : null;
}

function talentText(level: number | undefined): string {
  return level ? String(level) : "—";
}

function critNote(cr: number, cd: number, forgiveRate: boolean): GuideCheck {
  const cv = cr * 2 + cd;
  if (forgiveRate && cr >= 40 && cr <= 80) {
    return {
      ok: cv >= 160 || cd >= 140,
      label: "치명타",
      detail: `확률 ${cr.toFixed(1)}% / 피해 ${cd.toFixed(1)}%. 치명타 환산 ${cv.toFixed(0)}. 세트가 확률을 보태므로 피해 위주로 보면 됩니다.`,
    };
  }
  if (cr > 100) {
    return {
      ok: false,
      label: "치명타",
      detail: `확률 ${cr.toFixed(1)}%로 100%를 넘습니다. 왕관을 치명타 피해로 바꾸는 편이 낫습니다.`,
    };
  }
  if (cr < 50) {
    return {
      ok: false,
      label: "치명타",
      detail: `확률 ${cr.toFixed(1)}% / 피해 ${cd.toFixed(1)}%. 확률이 낮아 피해가 들쭉날쭉합니다. 확률 50% 위를 먼저 맞춥니다.`,
    };
  }
  const ratio = cd / Math.max(cr, 1);
  const balanced = ratio >= 1.6 && ratio <= 2.6;
  return {
    ok: balanced && cv >= 160,
    label: "치명타",
    detail: `확률 ${cr.toFixed(1)}% / 피해 ${cd.toFixed(1)}% (비율 1:${ratio.toFixed(1)}, 환산 ${cv.toFixed(0)}). 목표는 확률:피해 = 1:2 근처입니다.`,
  };
}

export function evaluateBuild(
  character: Omit<CharacterBuild, "guide">,
  template: GuideTemplate | null
): GuideReport {
  const known = Boolean(template);
  const elementGoblet = elementDmgKey(character.element);
  const guide: GuideTemplate = template ?? {
    id: character.id,
    role: "딜러",
    scaling: "atk",
    sands: ["atk_"],
    goblet: elementGoblet ? [elementGoblet, "atk_"] : ["atk_"],
    circlet: ["cr", "cd"],
    sets: [],
    setNote: "전용 세트 표가 아직 없습니다.",
    substats: "치명타 → 공격력% → 원소 충전",
    erMin: 120,
    erNote: "원소폭발을 매번 쓰려면 120%보다 높게.",
    talentFocus: "burst",
    talentNote: "원소폭발과 주로 쓰는 재능을 8레벨 위로.",
    weaponNote: "공격력·치명타 무기가 무난합니다.",
    teamNote: "원소 부착, 버프, 힐 또는 실드를 나눠 갖는 4인 파티를 권합니다.",
  };

  const checks: GuideCheck[] = [];
  const suggestions: string[] = [];

  checks.push({
    ok: character.level >= 80,
    label: "캐릭터 레벨",
    detail:
      character.level >= 90
        ? `${character.level}레벨.`
        : `${character.level}레벨. 반응·특성 배율은 90에서 한 번 더 오릅니다.`,
  });
  if (character.level < 80) {
    suggestions.push("캐릭터를 80 이상, 가능하면 90까지 돌파하세요.");
  }

  if (character.weapon) {
    const refined = character.weapon.refinement >= 1;
    checks.push({
      ok: character.weapon.level >= 80,
      label: "무기",
      detail: `${character.weapon.name} ${character.weapon.level}레벨 · 재련 ${character.weapon.refinement}${refined ? "" : ""}. ${guide.weaponNote}`,
    });
    if (character.weapon.level < 90) {
      suggestions.push(`무기 ${character.weapon.name}을 90까지 올리면 기초 능력치가 올라갑니다.`);
    }
  } else {
    checks.push({ ok: false, label: "무기", detail: "무기 정보를 가져오지 못했습니다." });
  }

  const mains: Array<[ArtifactSlot, StatKey[]]> = [
    ["sands", guide.sands],
    ["goblet", guide.goblet],
    ["circlet", guide.circlet],
  ];
  for (const [slot, wanted] of mains) {
    const artifact = piece(character.artifacts, slot);
    if (!artifact) {
      checks.push({
        ok: false,
        label: SLOT_LABEL[slot],
        detail: "비어 있습니다.",
      });
      suggestions.push(`${SLOT_LABEL[slot]}에 ${labels(wanted)} 주옵을 채우세요.`);
      continue;
    }
    const ok = wanted.includes(artifact.main.key);
    checks.push({
      ok,
      label: `${SLOT_LABEL[slot]} 주옵`,
      detail: ok
        ? `${artifact.main.display}. 추천(${labels(wanted)})에 맞습니다.`
        : `지금 ${artifact.main.display}. 추천은 ${labels(wanted)}입니다.`,
    });
    if (!ok) {
      suggestions.push(`${SLOT_LABEL[slot]} 주옵을 ${labels(wanted)} 쪽으로 바꾸세요.`);
    }
  }

  if (guide.sets.length === 0) {
    checks.push({
      ok: character.artifacts.length >= 4,
      label: "세트",
      detail: `${equippedSets(character.artifacts)}. ${guide.setNote}`,
    });
  } else {
    const hit = guide.sets
      .map((option) => setMatch(character.artifacts, option.aliases, option.pieces))
      .find(Boolean);
    checks.push({
      ok: Boolean(hit),
      label: "세트",
      detail: hit ? `${hit}. ${guide.setNote}` : `지금 ${equippedSets(character.artifacts)}. ${guide.setNote}`,
    });
    if (!hit) suggestions.push(`세트: ${guide.setNote}`);
  }

  if (character.stats && guide.scaling !== "heal" && guide.scaling !== "em") {
    const forgive = guide.sets.some((option) =>
      option.aliases.some((alias) => ["blizzard", "얼음바람", "marechaussee", "그림자 사냥", "obsidian", "흑요석"].includes(alias))
    );
    checks.push(critNote(character.stats.cr, character.stats.cd, forgive && guide.id !== 0));
  } else if (character.stats && guide.scaling === "em") {
    checks.push({
      ok: character.stats.em >= 600,
      label: "원소 마스터리",
      detail: `${Math.round(character.stats.em)}. 확산·만개·발화 서포터는 800 전후를 봅니다.`,
    });
    if (character.stats.em < 500) suggestions.push("시계·성배·왕관을 원소 마스터리로 맞추세요.");
  } else if (!character.stats) {
    checks.push({
      ok: false,
      label: "전투 스탯",
      detail: "최종 스탯은 프로필 전시(Enka)에 올린 캐릭터만 계산됩니다. 호요랩 명단에는 주옵·부옵만 있습니다.",
    });
  }

  if (character.stats) {
    const er = character.stats.er;
    const ok = er + 0.05 >= guide.erMin;
    checks.push({
      ok,
      label: "원소 충전",
      detail: `${er.toFixed(1)}%. 목표 ${guide.erMin}% 이상. ${guide.erNote}`,
    });
    if (!ok) suggestions.push(`원소 충전을 ${guide.erMin}% 근처까지 올리세요.`);
  }

  const focus = talentLevel(character.talents, guide.talentFocus);
  if (focus != null) {
    const goal = character.level >= 80 ? 8 : 6;
    checks.push({
      ok: focus >= goal,
      label: "특성",
      detail: `평타 ${talentText(character.talents?.normal)} / 원소전투 ${talentText(character.talents?.skill)} / 원소폭발 ${talentText(character.talents?.burst)}. ${guide.talentNote}`,
    });
    if (focus < goal) suggestions.push(guide.talentNote);
  }

  const earned = checks.filter((check) => check.ok).length;
  const score = checks.length === 0 ? 0 : Math.round((earned / checks.length) * 100);
  const headline = !known
    ? "전용 공략 표가 없어 일반 공격 딜러 기준으로 봤습니다."
    : score >= 85
      ? "추천 빌드에 잘 맞아 있습니다."
      : score >= 60
        ? "뼈대는 맞습니다. 표시된 항목만 손보면 됩니다."
        : "주옵·세트·충전 중 큰 어긋남이 있습니다.";

  return {
    score,
    headline,
    role: guide.role,
    known,
    checks,
    suggestions: suggestions.slice(0, 4),
    teamNote: guide.teamNote,
    weaponNote: guide.weaponNote,
  };
}
