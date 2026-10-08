import { openai } from "@ai-sdk/openai";
import { generateText, isStepCount, jsonSchema, Output } from "ai";
import { NextResponse } from "next/server";
import { fail } from "@/lib/server/respond";
import { requireUser } from "@/lib/server/session";
import { answerCoversParty, combatBriefText, keepStarTeam, keepTalentFacts, parseCombatAnswer, type PartyCombatMember, type PartyGuide } from "@/lib/partyBrief";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const recent = new Map<string, number[]>();
const answers = new Map<string, { at: number; body: PartyGuide }>();
const ANSWER_TTL_MS = 60 * 60 * 1000;

const shortText = { type: "string" } as const;

const combatSchema = jsonSchema<Omit<PartyGuide, "sources">>({
  type: "object",
  additionalProperties: false,
  required: ["gaps", "swaps", "gear", "lineup", "steps", "note"],
  properties: {
    gaps: { type: "array", minItems: 1, maxItems: 4, items: { ...shortText, maxLength: 110 } },
    swaps: {
      type: "array",
      minItems: 0,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["out", "inn", "reason"],
        properties: {
          out: { ...shortText, maxLength: 24 },
          inn: { ...shortText, maxLength: 24 },
          reason: { ...shortText, maxLength: 110 },
        },
      },
    },
    gear: {
      type: "array",
      minItems: 0,
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "item", "now", "goal", "reason"],
        properties: {
          name: { ...shortText, maxLength: 24 },
          item: { ...shortText, maxLength: 24 },
          now: { ...shortText, maxLength: 28 },
          goal: { ...shortText, maxLength: 32 },
          reason: { ...shortText, maxLength: 90 },
        },
      },
    },
    lineup: {
      type: "array",
      minItems: 4,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "role", "state"],
        properties: {
          name: { ...shortText, maxLength: 24 },
          role: { ...shortText, maxLength: 36 },
          state: { type: "string", enum: ["유지", "추가"] },
        },
      },
    },
    steps: {
      type: "array",
      minItems: 2,
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "detail"],
        properties: {
          title: { ...shortText, maxLength: 56 },
          detail: { ...shortText, maxLength: 140 },
        },
      },
    },
    note: { ...shortText, maxLength: 140 },
  },
});

const INSTRUCTIONS = `너는 원신 파티 코치다. 입력은 지금 넣은 캐릭터와 그 계정의 스탯이다. 칸 번호는 배치일 뿐이고 시전 순서가 아니다.
답은 지정된 칸만 채운다. 칸 밖 설명, 인터넷 주소, 출처 이름은 넣지 않는다.

gaps: 이 파티에서 실제로 비는 역할이나 원소. 1~3개. 문제가 없으면 "큰 구멍은 없습니다" 한 줄만 적는다. 없는 문제를 만들지 않는다.
swaps: 빼는 캐릭터 out, 넣는 캐릭터 inn, 이유 reason. 지금 네 명이 이미 성립하면 빈 배열. 널리 쓰는 정상 조합을 억지로 바꾸지 않는다.
gear: 남기는 캐릭터는 입력의 현재 수치만 now에 적는다. 특성 now는 입력의 평타, 원소전투, 원소폭발 숫자를 그대로 쓴다. 그 숫자보다 낮다고 쓰지 않고, 이미 목표 이상이면 그 특성은 넣지 않는다. 추가 캐릭터는 계정에 없으므로 now는 "없음"이고 무기나 세트 방향만 적어도 된다. item은 무기, 재련, 평타, 원소전투, 원소폭발, 성유물 세트, 모래, 잔, 모자, 또는 스탯 이름. goal은 준졸업 또는 졸업, 혹은 그 캐릭터에게 필요한 지점. reason은 왜 거기까지만 올리면 되는지 한 문장. 이미 졸업이거나 목표가 필요 없으면 그 항목은 뺀다. 올릴 것이 없으면 빈 배열.
lineup: 추천 4명. 지금 멤버가 남으면 state는 "유지"이고 이름은 입력 그대로. 새로 넣는 사람은 state "추가"와 한국 이름. role은 그 자리에서 하는 일.
steps: lineup 4명의 버튼 순서. 장판, 보호막, 버프, 원소 부착, 치유를 먼저 하고 그 캐릭터는 내린다. 필드를 잡고 공격하는 캐릭터는 그 다음 들어온다. title은 이름과 버튼만. 짧게 누르기, 홀드, 홀드 후 낙하, 강공격, 일반공격, 원소폭발처럼 손가락이 하는 일을 쓴다. detail은 그 타이밍인 이유 한 문장. lineup의 이름은 모두 순서에 한 번은 나온다.
note: 이 계정 스탯 때문에 순서가 달라지면 한 문장. 없으면 빈 문자열.

규칙:
- 역할 힌트보다 무기, 성유물, 스탯, 기준의 준졸업과 졸업을 우선한다. 원소 마스터리나 충전 위주면 서포터로, 공격력과 치명 위주면 딜러로 본다.
- 특성의 현재 레벨은 입력 문장의 숫자다. 평타가 8이면 1이라고 쓰거나 8로 올리라고 하지 않는다.
- 충전 효율이 기준보다 낮으면 그 원소폭발은 게이지가 찼을 때만 순서에 넣는다.
- 프레임 수를 만들지 않는다. 초가 필요한 메커니즘만 적는다.
- web_search는 입력의 캐릭터, 성유물, 무기, 아이템 중에 네가 모르는 이름이 있을 때만 호출한다. 아는 이름은 검색하지 말고 바로 답한다. 모르는 이름만 찾고, 검색은 두 번을 넘기지 않는다. 이 계정의 스탯 숫자는 검색하지 않는다. 검색 결과와 아래 규칙이 다르면 아래 규칙을 따른다.
- 아를레키노의 원소전투는 짧게 누른다. 2돌 미만이면 원소전투 뒤 약 5초 동안 다른 캐릭터가 장판을 깔고, 그 다음 강공격으로 돌아온다. 2돌 이상이면 장판을 먼저 깐 뒤 원소전투 직후 강공격을 넣는다.
- 종려와 카즈하의 원소전투는 홀드다. 카즈하는 홀드 후 낙하공격이다.
- 슈브르즈가 있으면 불과 번개만 둔다. 닐루가 있으면 물과 풀만 둔다.
- 호두에게는 생명력을 크게 채우는 힐러를 붙이지 않는다. 아를레키노에게는 계약을 지우는 힐러를 붙이지 않는다. 베넷은 아를레키노 쪽에 둔다.
- 필드를 잡는 메인 딜러는 한 명만 둔다.
- 베스나는 바람 원소 별확산 딜러다. 물이 아니고 보댜니차가 아니다. 물 캐릭터로 바꾸거나 빼지 않는다.
- 얼음 여행자가 있으면 얼음 확산은 별확산, 초전도는 별초전도가 된다. 이 효과를 받으려고 넣은 캐릭터를 물이 없다는 이유로 빼지 않는다.
- 얼음 여행자와 베스나 또는 미즈키가 같이 있으면 별확산 파티다. 얼음을 먼저 묻히고 바람이 확산한 뒤 별확산 딜러가 필드에 남는다. 물은 조건이 아니다. 설탕과 디오나는 맞는 서포터다. 이 네 명을 교체하지 않는다. 검색 결과가 다르면 이 규칙을 따른다.`;

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
  let userId: string;
  try {
    userId = (await requireUser()).id;
  } catch (error) {
    return fail(error);
  }
  if (tooMany(userId) || tooMany(clientIp(request))) {
    return NextResponse.json({ error: "failed" }, { status: 429 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 400 });
  }
  const members = asMembers(payload);
  if (!members) return NextResponse.json({ error: "failed" }, { status: 400 });

  const cacheKey = `3:${JSON.stringify(members)}`;
  const cached = answers.get(cacheKey);
  if (cached && Date.now() - cached.at < ANSWER_TTL_MS) {
    return NextResponse.json(cached.body);
  }

  try {
    const { output, steps } = await generateText({
      model: openai("gpt-6-luna"),
      instructions: INSTRUCTIONS,
      prompt: combatBriefText(members),
      tools: {
        web_search: openai.tools.webSearch({
          searchContextSize: "medium",
          filters: {
            allowedDomains: [
              "keqingmains.com",
              "genshin-impact.fandom.com",
              "hoyolab.com",
              "namu.wiki",
              "ambr.top",
              "gi.yatta.moe",
            ],
          },
        }),
      },
      prepareStep: ({ stepNumber }) => {
        if (stepNumber >= 2) return { toolChoice: "none" };
        return { toolChoice: "auto" };
      },
      stopWhen: isStepCount(4),
      output: Output.object({ schema: combatSchema }),
      timeout: 50000,
      maxRetries: 0,
      providerOptions: {
        openai: { store: false },
      },
    });
    const searches = steps.reduce((count, step) => count + step.toolCalls.filter((call) => call.toolName === "web_search").length, 0);
    console.error("party-combat searches", searches);
    const parsedRaw = parseCombatAnswer(output);
    const parsed = parsedRaw ? keepTalentFacts(keepStarTeam(parsedRaw, members), members) : null;
    if (!parsed || !answerCoversParty(parsed, members)) {
      return NextResponse.json({ error: "failed" }, { status: 502 });
    }
    answers.set(cacheKey, { at: Date.now(), body: parsed });
    return NextResponse.json(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    console.error("party-combat failed", message.replace(/sk-[A-Za-z0-9_-]+/g, "[redacted]"));
    return NextResponse.json({ error: "failed" }, { status: 502 });
  }
}

function asMembers(value: unknown): PartyCombatMember[] | null {
  if (!value || typeof value !== "object") return null;
  const rows = (value as { members?: unknown }).members;
  if (!Array.isArray(rows) || rows.length < 2 || rows.length > 4) return null;
  const members: PartyCombatMember[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") return null;
    const item = row as Record<string, unknown>;
    const name = clip(item.name, 40);
    const level = num(item.level, 1, 100);
    const constellation = num(item.constellation, 0, 6);
    if (!name || level == null || constellation == null) return null;
    members.push({
      name,
      element: clip(item.element, 8) || "무",
      level,
      constellation,
      roleHint: clip(item.roleHint, 20) || "미정",
      talents: clip(item.talents, 80) || "특성 정보 없음",
      weapon: clip(item.weapon, 80) || "무기 정보 없음",
      artifacts: clip(item.artifacts, 180) || "성유물 없음",
      stats: clip(item.stats, 240) || "스탯 없음",
      targets: clip(item.targets, 320) || "기준 없음",
    });
  }
  return members;
}

function tooMany(ip: string): boolean {
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((at) => now - at < 60_000);
  if (hits.length >= 8) {
    recent.set(ip, hits);
    return true;
  }
  hits.push(now);
  recent.set(ip, hits);
  return false;
}

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || "local";
}

function clip(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

function num(value: unknown, min: number, max: number): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) return null;
  return parsed;
}
