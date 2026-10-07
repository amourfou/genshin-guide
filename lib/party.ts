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

const CHEVREUSE = 10000090;
const NILOU = 10000070;
const HU_TAO = 10000046;
const BENNETT = 10000032;
const ARLECCHINO = 10000096;
const XIANGLING = 10000023;

// Bennett heals Hu Tao above 50% HP. He still belongs with Arlecchino.
// Jean and Xianyun are omitted here because Hu Tao–Furina teams use them.
// Escoffier is omitted from Arlecchino: Citlali melt teams use her.
const HU_TAO_HEALERS = new Set([
  BENNETT,
  10000014, // 바바라
  10000035, // 치치
  10000054, // 코코미
  10000065, // 쿠키 시노부
  10000077, // 요요
  10000082, // 백출
  10000088, // 샤를로트
  10000095, // 시그윈
  10000140, // 보댜니차
]);

const ARLE_HEALERS = new Set([
  10000003, // 진
  10000014,
  10000035,
  10000054,
  10000065,
  10000077,
  10000082,
  10000088,
  10000093, // 한운
  10000095,
  10000140,
]);

const SWIRLERS = new Set([10000022, 10000043, 10000047]); // 벤티, 설탕, 카즈하
const SWIRLABLE = new Set<ElementKey>(["pyro", "hydro", "electro", "cryo"]);

function hasBatchim(name: string): boolean {
  const last = name.charCodeAt(name.length - 1);
  return last >= 0xac00 && last <= 0xd7a3 && (last - 0xac00) % 28 !== 0;
}

function topic(name: string): string {
  return `${name}${hasBatchim(name) ? "은" : "는"}`;
}

function subject(name: string): string {
  return `${name}${hasBatchim(name) ? "이" : "가"}`;
}

export interface PartyMisfit {
  id: number;
  name: string;
  reason: string;
  text: string;
}

function misfitReason(member: CharacterBuild, present: CharacterBuild[]): string | null {
  const others = present.filter((item) => item.id !== member.id);
  if (others.length === 0) return null;

  const chevreuse = present.find((item) => item.id === CHEVREUSE);
  if (chevreuse && present.some((item) => item.element !== "pyro" && item.element !== "electro")) {
    if (member.id === CHEVREUSE) return `불·번개 외 원소가 있으면 ${chevreuse.name} 특성이 꺼집니다.`;
    if (member.element !== "pyro" && member.element !== "electro") return `${chevreuse.name} 파티는 불·번개만 가능합니다.`;
  }

  const nilou = present.find((item) => item.id === NILOU);
  if (nilou && present.some((item) => item.element !== "hydro" && item.element !== "dendro")) {
    if (member.id === NILOU) return `물·풀 외 원소가 있으면 ${nilou.name} 특성이 꺼집니다.`;
    if (member.element !== "hydro" && member.element !== "dendro") return `${nilou.name} 파티는 물·풀만 가능합니다.`;
  }

  const huTao = present.find((item) => item.id === HU_TAO);
  if (huTao && HU_TAO_HEALERS.has(member.id)) {
    return `회복이 ${huTao.name}의 체력을 50% 위로 올리면 피해 보너스가 꺼집니다.`;
  }

  const arle = present.find((item) => item.id === ARLECCHINO);
  if (arle && ARLE_HEALERS.has(member.id)) {
    return `힐이 ${arle.name}의 생명의 빚을 지우면 피해가 줄어듭니다.`;
  }

  if (member.id === XIANGLING && huTao) {
    return `${subject(huTao.name)} 쓸 불 부착을 먼저 가져갑니다.`;
  }

  if (SWIRLERS.has(member.id) && others.every((item) => !SWIRLABLE.has(item.element))) {
    return "확산할 불·물·번개·얼음이 없습니다.";
  }

  const mains = present.filter((item) => item.guide.role === "메인 딜러");
  if (mains.length >= 2 && member.guide.role === "메인 딜러") {
    return "메인 딜러가 둘 이상이라 필드 시간을 나눠야 합니다.";
  }

  return null;
}

export function partyMisfits(members: Array<CharacterBuild | null>): PartyMisfit[] {
  const present = members.filter((member): member is CharacterBuild => Boolean(member));
  const found: PartyMisfit[] = [];
  for (const member of present) {
    const reason = misfitReason(member, present);
    if (!reason) continue;
    found.push({
      id: member.id,
      name: member.name,
      reason,
      text: `${topic(member.name)} 이 파티에 맞지 않습니다. ${reason}`,
    });
  }
  return found;
}

export function partyAdvice(members: Array<CharacterBuild | null>): string[] {
  const present = members.filter((member): member is CharacterBuild => Boolean(member));
  if (present.length === 0) return ["캐릭터 4명을 고르면 공명과 역할이 여기에 표시됩니다."];
  const misfitIds = new Set(partyMisfits(members).map((item) => item.id));
  const lines = present
    .filter((member) => !misfitIds.has(member.id))
    .map((member) => `${member.name} · ${member.guide.role}. ${member.guide.teamNote}`);
  const roles = present.map((member) => member.guide.role);
  const hasSustain = roles.some((role) => role === "힐러" || role === "실더");
  const hasDamage = roles.some((role) => role.includes("딜러"));
  if (!hasSustain) lines.push("힐러나 실드가 없습니다. 경직과 회복을 맡을 캐릭터를 한 명 넣는 편이 안정적입니다.");
  if (!hasDamage) lines.push("메인 딜러로 표시된 캐릭터가 없습니다. 한 명은 필드를 잡고 피해를 넣는 역할이 필요합니다.");
  if (present.length < 4) lines.push("자리는 4칸입니다. 빈 자리에 부착·버프·생존 중 없는 역할을 넣으세요.");
  return lines;
}

export interface SavedParty {
  id: string;
  name: string;
  slots: Array<number | null>;
}

export interface PartyFile {
  activeId: string;
  parties: SavedParty[];
}

function partyId(): string {
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function blankSlots(): Array<number | null> {
  return [null, null, null, null];
}

export function createParty(name: string): SavedParty {
  return { id: partyId(), name, slots: blankSlots() };
}

export function nextPartyName(parties: SavedParty[]): string {
  const used = parties.map((party) => {
    const match = /^파티 (\d+)$/.exec(party.name.trim());
    return match ? Number(match[1]) : 0;
  });
  return `파티 ${Math.max(0, ...used) + 1}`;
}

function asSlots(value: unknown): Array<number | null> | null {
  if (!Array.isArray(value) || value.length !== 4) return null;
  if (!value.every((item) => item == null || typeof item === "number")) return null;
  return value.map((item) => (typeof item === "number" ? item : null));
}

/** Accepts the old single 4-slot array and the multi-party file. */
export function parsePartyFile(raw: string | null): PartyFile {
  const fresh = () => {
    const party = createParty("파티 1");
    return { activeId: party.id, parties: [party] };
  };
  if (!raw) return fresh();
  try {
    const parsed = JSON.parse(raw) as unknown;
    const legacy = asSlots(parsed);
    if (legacy) {
      const party = createParty("파티 1");
      party.slots = legacy;
      return { activeId: party.id, parties: [party] };
    }
    if (!parsed || typeof parsed !== "object") return fresh();
    const file = parsed as Partial<PartyFile>;
    if (!Array.isArray(file.parties)) return fresh();
    const parties = file.parties.flatMap((party) => {
      if (!party || typeof party.id !== "string") return [];
      const slots = asSlots(party.slots);
      if (!slots) return [];
      const name = typeof party.name === "string" && party.name.trim() ? party.name.trim() : "파티";
      return [{ id: party.id, name, slots }];
    });
    if (parties.length === 0) return fresh();
    const activeId = parties.some((party) => party.id === file.activeId) ? String(file.activeId) : parties[0].id;
    return { activeId, parties };
  } catch {
    return fresh();
  }
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
