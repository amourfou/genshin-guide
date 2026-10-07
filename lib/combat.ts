import type { CharacterBuild, ElementKey } from "@/lib/types";

export interface CombatStep {
  title: string;
  detail: string;
}

interface Actor {
  id: number;
  name: string;
  constellation: number;
  role: string;
  element: ElementKey;
  slot: number;
}

interface Action {
  phase: number;
  slot: number;
  title: string;
  detail: string;
}

function support(actor: Actor): Action[] {
  const { id, name, constellation: c } = actor;
  switch (id) {
    case 10000030:
      return [
        {
          phase: 20,
          slot: actor.slot,
          title: `${name} 원소전투 홀드`,
          detail: "홀드로 보호막을 깔고 내립니다. 운석이 필요하면 원소폭발을 먼저 씁니다.",
        },
      ];
    case 10000047:
      return [
        {
          phase: 40,
          slot: actor.slot,
          title: `${name} 원소전투 홀드 후 낙하공격`,
          detail: "홀드로 띄운 다음 떨어져 확산합니다. 피해 보너스가 필요하면 그 전에 원소폭발을 켭니다.",
        },
      ];
    case 10000022:
      return [
        {
          phase: 38,
          slot: actor.slot,
          title: `${name} 원소폭발`,
          detail: "원소폭발로 적을 모읍니다. 바람을 더 띄울 때는 원소전투를 홀드합니다.",
        },
      ];
    case 10000032:
      return [
        {
          phase: 30,
          slot: actor.slot,
          title: `${name} 원소폭발`,
          detail: "영역 안에서 공격력 버프와 힐이 켜집니다. 딜러의 스킬은 이 안에서 씁니다.",
        },
      ];
    case 10000089:
      return [
        {
          phase: 28,
          slot: actor.slot,
          title: `${name} 원소전투 후 원소폭발`,
          detail: "살롱 멤버를 소환하고 원소폭발로 피해 버프를 켭니다. 체력이 오르내릴수록 버프가 쌓입니다.",
        },
      ];
    case 10000073:
      return [
        {
          phase: 34,
          slot: actor.slot,
          title: `${name} 원소전투`,
          detail: "도감을 연결해 풀을 붙입니다. 멀리 찍을 때만 홀드합니다. 원소폭발은 원소 마스터리 버프입니다.",
        },
      ];
    case 10000025:
      return [
        {
          phase: 48,
          slot: actor.slot,
          title: `${name} 원소전투 후 원소폭발`,
          detail: "비를 내려 두고 필드에서 내립니다.",
        },
      ];
    case 10000060:
      return [
        {
          phase: 48,
          slot: actor.slot,
          title: `${name} 원소전투 후 원소폭발`,
          detail: "달려서 표를 붙인 뒤 원소폭발로 물 부착을 남깁니다.",
        },
      ];
    case 10000023:
      return [
        {
          phase: 52,
          slot: actor.slot,
          title: `${name} 원소폭발 후 원소전투`,
          detail: "버프 영역이나 부착 뒤에 원소폭발을 깝니다. 이어서 구운 원소전투를 남깁니다.",
        },
      ];
    case 10000052:
      return [
        {
          phase: 56,
          slot: actor.slot,
          title: `${name} 원소전투`,
          detail: "눈을 깔아 파티 원소폭발 피해를 보탭니다. 게이지를 돌릴 때 원소폭발 후 평타로 이어 갑니다.",
        },
      ];
    case 10000031:
      return [
        {
          phase: 46,
          slot: actor.slot,
          title: `${name} 원소전투`,
          detail: "오즈를 소환하고 내립니다.",
        },
      ];
    case 10000054:
      return [
        {
          phase: 24,
          slot: actor.slot,
          title: `${name} 원소전투`,
          detail: "해파리로 치유를 깔아 둡니다.",
        },
      ];
    case 10000140:
      return [
        {
          phase: 24,
          slot: actor.slot,
          title: `${name} 원소전투`,
          detail: "치유와 내성 감소를 켜 두고 내립니다.",
        },
      ];
    case 10000103:
      return [
        {
          phase: 22,
          slot: actor.slot,
          title: `${name} 원소전투 후 평타 두 번`,
          detail: "샘플을 찍고 평타 두 번으로 저항 감소를 켠 뒤 내립니다.",
        },
      ];
    case 10000090:
      return [
        {
          phase: 36,
          slot: actor.slot,
          title: `${name} 원소전투`,
          detail: "과부하가 난 적에게 짧게 눌러 불·번개 저항을 깎습니다. 원소폭발은 공격력 버프입니다.",
        },
      ];
    case 10000096:
      if (c >= 2) {
        return [
          {
            phase: 74,
            slot: actor.slot,
            title: `${name} 원소전투 후 바로 강공격`,
            detail: "2돌이라 표식이 붙는 순간 빚입니다. 원소전투 직후 강공격을 바로 넣고 평타로 이어 갑니다.",
          },
        ];
      }
      return [
        {
          phase: 12,
          slot: actor.slot,
          title: `${name} 원소전투`,
          detail: "2돌 전에는 표식이 빚이 되기까지 약 5초가 필요합니다. 그 시간을 다른 캐릭터로 채우려고 스킬을 먼저 씁니다.",
        },
        {
          phase: 84,
          slot: actor.slot,
          title: `${name} 몇 초 후 강공격`,
          detail: "표식 후 약 5초가 지났으면 강공격으로 흡수하고 평타를 넣습니다. 아직이면 몇 초 더 기다립니다.",
        },
      ];
    default:
      return [];
  }
}

function field(actor: Actor): Action | null {
  const { id, name } = actor;
  const carry: Record<number, Pick<Action, "title" | "detail">> = {
    10000046: {
      title: `${name} 원소전투 후 평타`,
      detail: "체력을 깎아 강화 상태에 들어갑니다. 원소폭발은 맞는 공격을 흘릴 때 씁니다.",
    },
    10000087: {
      title: `${name} 원소전투 후 강공격`,
      detail: "물방울을 만든 뒤 강공격을 충전합니다. 다른 원소와 반응해 용력 중첩을 맞추면 강공격이 길어집니다.",
    },
    10000002: {
      title: `${name} 대시 후 원소폭발`,
      detail: "대시로 얼음을 붙이고 원소폭발을 깐 다음 평타를 넣습니다.",
    },
    10000037: {
      title: `${name} 강공격`,
      detail: "강공격을 충전합니다. 원소폭발은 얼음 장판이 필요할 때 먼저 깝니다.",
    },
    10000026: {
      title: `${name} 원소폭발 후 낙하공격`,
      detail: "원소폭발로 강화한 뒤 낙하공격을 반복합니다.",
    },
    10000057: {
      title: `${name} 원소폭발 후 강공격`,
      detail: "원소전투로 슈퍼 아머를 켜고 원소폭발 뒤 강공격을 반복합니다.",
    },
    10000034: {
      title: `${name} 원소폭발 후 평타`,
      detail: "원소전투로 보호막을 켜고, 원소폭발 뒤 휩쓰는 평타를 넣습니다.",
    },
    10000078: {
      title: `${name} 원소전투 후 평타`,
      detail: "거울을 띄우고 평타를 넣습니다. 거울이 빠지면 원소전투나 원소폭발로 다시 맞춥니다.",
    },
    10000091: {
      title: `${name} 원소전투`,
      detail: "결정 파편을 모은 뒤 원소전투로 쏩니다. 파편이 많을수록 피해가 큽니다.",
    },
    10000098: {
      title: `${name} 원소전투 후 평타와 원소전투`,
      detail: "돌진 자세에서 평타와 원소전투를 번갈아 넣습니다.",
    },
    10000106: {
      title: `${name} 원소전투`,
      detail: "원소전투로 무기에 올라 공격합니다. 원소폭발은 싸움 기운이 찼을 때 씁니다.",
    },
  };
  const known = carry[id];
  if (known) return { phase: 80, slot: actor.slot, ...known };
  if (actor.role === "메인 딜러" || actor.role.includes("딜러")) {
    return {
      phase: 80,
      slot: actor.slot,
      title: `${name} 평타·강공격`,
      detail: "마지막에 필드에 남아 공격을 넣습니다.",
    };
  }
  return null;
}

function generic(actor: Actor): Action {
  const { name, role } = actor;
  if (role === "실더") {
    return {
      phase: 20,
      slot: actor.slot,
      title: `${name} 원소전투`,
      detail: "보호막을 깔고 내립니다.",
    };
  }
  if (role === "힐러") {
    return {
      phase: 24,
      slot: actor.slot,
      title: `${name} 원소전투`,
      detail: "치유를 켜 두고 내립니다. 원소폭발이 회복이면 그때 같이 씁니다.",
    };
  }
  if (role === "서포터" || actor.element === "anemo") {
    return {
      phase: 36,
      slot: actor.slot,
      title: `${name} 원소전투·원소폭발`,
      detail: "버프나 확산을 남기고 내립니다.",
    };
  }
  return {
    phase: 50,
    slot: actor.slot,
    title: `${name} 원소전투·원소폭발`,
    detail: "스킬을 깔고 필드에서 내립니다.",
  };
}

export function combatSteps(members: Array<CharacterBuild | null>): CombatStep[] {
  const actors: Actor[] = members.flatMap((member, slot) =>
    member
      ? [
          {
            id: member.id,
            name: member.name,
            constellation: member.constellation,
            role: member.guide.role,
            element: member.element,
            slot,
          },
        ]
      : []
  );
  if (actors.length === 0) return [];

  const mains = actors.filter((actor) => actor.role === "메인 딜러");
  const carryId = (mains[0] ?? actors.find((actor) => actor.role.includes("딜러")) ?? actors[actors.length - 1]).id;

  const actions: Action[] = [];
  for (const actor of actors) {
    const scripted = support(actor);
    if (scripted.length > 0) {
      actions.push(...scripted);
      continue;
    }
    if (actor.id === carryId) {
      const onField = field(actor);
      if (onField) actions.push(onField);
      continue;
    }
    actions.push(generic(actor));
  }

  actions.sort((a, b) => a.phase - b.phase || a.slot - b.slot);
  return actions.map(({ title, detail }) => ({ title, detail }));
}
