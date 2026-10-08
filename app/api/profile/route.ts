import { NextResponse } from "next/server";
import crypto from "crypto";
import { fetchEnka } from "@/lib/enka";
import { fetchHoyolabBundle, HoyolabError, sanitizeCookie } from "@/lib/hoyolab";
import { buildProfile } from "@/lib/normalize";
import { accountSecret } from "@/lib/server/accounts";
import { ApiError } from "@/lib/server/db";
import { loadGuides } from "@/lib/server/guides";
import { fail } from "@/lib/server/respond";
import { requireUser } from "@/lib/server/session";
import type { HoyolabState } from "@/lib/types";
import { isUid } from "@/lib/uid";

export const dynamic = "force-dynamic";

const cache = new Map<string, { at: number; body: unknown }>();
const TTL_MS = 60_000;

/** The browser names one of its accounts. The uid and HoYoLAB cookie are read here, never sent by the browser. */
async function storedAccount(request: Request): Promise<{ uid: string; cookie: string }> {
  let body: { accountId?: unknown };
  try {
    body = (await request.json()) as { accountId?: unknown };
  } catch {
    throw new ApiError(400, "요청 형식이 잘못되었습니다.");
  }
  if (typeof body.accountId !== "string" || !body.accountId) throw new ApiError(400, "계정을 고르세요.");
  const user = await requireUser();
  return accountSecret(user.id, body.accountId);
}

export async function POST(request: Request) {
  let uid: string;
  let stored: string;
  try {
    ({ uid, cookie: stored } = await storedAccount(request));
  } catch (error) {
    return fail(error);
  }
  if (!isUid(uid)) {
    return NextResponse.json({ error: "UID는 9자리 숫자입니다." }, { status: 400 });
  }

  let cookie = "";
  let badCookie = "";
  if (stored.trim()) {
    try {
      cookie = sanitizeCookie(stored);
    } catch (error) {
      badCookie = error instanceof Error ? error.message : "저장된 쿠키 형식이 잘못되었습니다.";
    }
  }

  const cacheKey = crypto
    .createHash("sha256")
    .update(`${uid}:${cookie}`)
    .digest("hex")
    .slice(0, 24);
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < TTL_MS) {
    return NextResponse.json(hit.body);
  }

  const warnings: string[] = [];
  let enka: unknown = null;
  let bundle: Awaited<ReturnType<typeof fetchHoyolabBundle>> | null = null;
  let hoyolab: HoyolabState = badCookie
    ? { status: "error", message: badCookie }
    : { status: "no-cookie", message: "저장된 호요랩 쿠키가 없습니다." };

  try {
    enka = await fetchEnka(uid);
    const row = enka as { avatarInfoList?: unknown[] };
    if (!row?.avatarInfoList?.length) {
      warnings.push("프로필 전시에 캐릭터가 없습니다. 게임에서 상세 정보 공개를 켜고, 로그아웃하거나 주전자에 들어갔다 나와야 갱신됩니다.");
    }
  } catch (error) {
    warnings.push(error instanceof Error ? error.message : "Enka 조회에 실패했습니다.");
  }

  if (cookie) {
    try {
      bundle = await fetchHoyolabBundle(uid, cookie);
      hoyolab = { status: "ok", message: "" };
    } catch (error) {
      const message = error instanceof HoyolabError ? error.message : "호요랩 조회에 실패했습니다.";
      console.error("profile hoyolab failed", error instanceof HoyolabError ? error.retcode ?? "http" : "unknown", message);
      hoyolab = { status: "error", message };
      warnings.push(message);
    }
  } else if (badCookie) {
    warnings.push(badCookie);
  } else {
    warnings.push("쿠키가 없으면 프로필에 전시한 캐릭터만 보입니다. 보유 캐릭터 전체와 나선·환상극 파티는 계정 화면에서 쿠키를 저장한 뒤 불러옵니다.");
  }

  if (!enka && !bundle) {
    return NextResponse.json(
      { error: warnings[0] ?? "계정 정보를 가져오지 못했습니다.", warnings, hoyolab },
      { status: 502 }
    );
  }

  const guides = await loadGuides();
  const profile = buildProfile({
    uid,
    index: bundle?.index ?? null,
    hoyoCharacters: bundle?.characters ?? null,
    enka,
    abyss: bundle?.abyss ?? null,
    theater: bundle?.theater ?? null,
    guides,
    warnings,
    usedHoyolab: Boolean(bundle),
    usedEnka: Boolean(enka),
    hoyolab,
  });

  cache.set(cacheKey, { at: Date.now(), body: profile });
  return NextResponse.json(profile);
}
