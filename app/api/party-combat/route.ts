import { openai } from "@ai-sdk/openai";
import { generateText, isStepCount, jsonSchema, Output } from "ai";
import { NextResponse } from "next/server";
import { answerMentionsParty, combatBriefText, parseCombatAnswer, type PartyCombatMember } from "@/lib/partyBrief";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const recent = new Map<string, number[]>();
const answers = new Map<string, { at: number; body: { steps: { title: string; detail: string }[]; note: string; sources: string[] } }>();
const ANSWER_TTL_MS = 60 * 60 * 1000;

const combatSchema = jsonSchema<{ steps: { title: string; detail: string }[]; note: string }>({
  type: "object",
  additionalProperties: false,
  required: ["steps", "note"],
  properties: {
    note: { type: "string", maxLength: 180 },
    steps: {
      type: "array",
      minItems: 2,
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "detail"],
        properties: {
          title: { type: "string", maxLength: 80 },
          detail: { type: "string", maxLength: 220 },
        },
      },
    },
  },
});

const INSTRUCTIONS = `너는 원신 파티의 실제 교대 순서를 한국어로 정리한다.
입력은 지금 파티의 캐릭터와 스탯이다. 칸 번호는 배치일 뿐이고 시전 순서가 아니다.

순서:
- 장판, 보호막, 버프, 원소 부착, 치유를 먼저 깔고 그 캐릭터는 내린다.
- 필드를 잡고 공격하는 캐릭터는 그 다음에 들어온다.
- 역할 힌트보다 무기, 성유물, 스탯을 우선한다. 원소 마스터리나 충전 위주면 서포터로, 공격력과 치명 위주면 딜러로 본다.
- 원소 충전 효율이 낮으면 그 원소폭발은 게이지가 될 때만 쓰라고 적는다.
- 파티에 없는 캐릭터는 넣지 않는다. 입력에 있는 이름은 그대로 쓴다.
- 답을 쓰기 전에 웹 검색으로 파티에 있는 캐릭터의 스킬 순서와 돌파 분기를 확인한다. 검색은 조작에만 쓰고, 이 계정의 스탯 숫자는 검색하지 않는다.
- 검색 결과와 지금 스탯이 다르면 스탯을 따른다. 충전 효율이 낮으면 원소폭발을 매 바퀴에 넣지 않는다.
- 프레임 수를 만들지 않는다. 초가 필요한 메커니즘만 적는다.
- title, detail, note에는 인터넷 주소나 출처 표기를 넣지 않는다.
- 아를레키노의 원소전투는 짧게 누른다. 2돌 미만이면 원소전투 뒤 약 5초 동안 다른 캐릭터가 장판을 깔고, 그 다음 아를레키노가 강공격으로 돌아온다. 2돌 이상이면 장판을 먼저 깐 뒤 아를레키노가 들어가 원소전투 직후 강공격을 넣는다.
- 종려와 카즈하의 원소전투는 홀드다. 카즈하는 홀드 후 낙하공격이다.
- title은 이름과 조작만, detail은 왜 지금 쓰는지 한 문장.
- note는 이 스탯 때문에 순서가 달라지는 점 한 문장이다. 없으면 빈 문자열.`;

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
  if (tooMany(clientIp(request))) {
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

  const cacheKey = JSON.stringify(members);
  const cached = answers.get(cacheKey);
  if (cached && Date.now() - cached.at < ANSWER_TTL_MS) {
    return NextResponse.json(cached.body);
  }

  try {
    const { output } = await generateText({
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
        if (stepNumber === 0) return { toolChoice: { type: "tool", toolName: "web_search" } };
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
    const parsed = parseCombatAnswer(output);
    if (!parsed || !answerMentionsParty(parsed.steps, members)) {
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
