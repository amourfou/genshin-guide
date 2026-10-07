import { ELEMENT_LABEL } from "@/lib/stats";
import type { CharacterBuild, ElementKey, PartyMember } from "@/lib/types";

const RESONANCE: Record<ElementKey, string> = {
  pyro: "불 공명: 공격력 +25%.",
  hydro: "물 공명: 생명력 +25%.",
  electro: "번개 공명: 전기 반응 시 원소 입자 생성.",
  cryo: "얼음 공명: 얼음 부착·빙결 대상에게 치명타 확률 +15%.",
  anemo: "바람 공명: 스태미나 소모 감소, 스킬 재사용 대기시간 -5%.",
  geo: "바위 공명: 보호막 강화. 보호막이 있으면 피해 +15%.",
  dendro: "풀 공명: 원소 마스터리 +50, 풀 반응 후 추가 마스터리.",
  none: "",
};

export interface ResonanceNote {
  title: string;
  detail: string;
}

export function resonances(members: Array<ElementKey | null | undefined>): ResonanceNote[] {
  const counts = new Map<ElementKey, number>();
  for (const element of members) {
    if (!element || element === "none") continue;
    counts.set(element, (counts.get(element) ?? 0) + 1);
  }
  const notes: ResonanceNote[] = [];
  for (const [element, count] of counts) {
    if (count >= 2 && RESONANCE[element]) {
      notes.push({ title: `${ELEMENT_LABEL[element]} 공명`, detail: RESONANCE[element] });
    }
  }
  const unique = [...counts.keys()];
  if (unique.length >= 4) {
    notes.push({
      title: "네 원소",
      detail: "서로 다른 원소 4종: 모든 원소 내성과 물리 내성 +15%.",
    });
  }
  if (notes.length === 0) {
    notes.push({
      title: "공명 없음",
      detail: "같은 원소가 둘 이상일 때 공명이 열립니다.",
    });
  }
  return notes;
}

export function partyAdvice(members: Array<CharacterBuild | null>): string[] {
  const present = members.filter((member): member is CharacterBuild => Boolean(member));
  if (present.length === 0) return ["캐릭터 4명을 고르면 공명과 역할이 여기에 표시됩니다."];
  const lines = present.map((member) => `${member.name} · ${member.guide.role}. ${member.guide.teamNote}`);
  const roles = present.map((member) => member.guide.role);
  const hasSustain = roles.some((role) => role === "힐러" || role === "실더");
  const hasDamage = roles.some((role) => role.includes("딜러"));
  if (!hasSustain) lines.push("힐러나 실드가 없습니다. 경직과 회복을 맡을 캐릭터를 한 명 넣는 편이 안정적입니다.");
  if (!hasDamage) lines.push("메인 딜러로 표시된 캐릭터가 없습니다. 한 명은 필드를 잡고 피해를 넣는 역할이 필요합니다.");
  if (present.length < 4) lines.push("자리는 4칸입니다. 빈 자리에 부착·버프·생존 중 없는 역할을 넣으세요.");
  return lines;
}

export function toMember(character: CharacterBuild): PartyMember {
  return {
    id: character.id,
    name: character.name,
    icon: character.icon,
    level: character.level,
    element: character.element,
  };
}
