import { NextResponse } from "next/server";
import { ApiError, dbFailure, requireDb } from "@/lib/server/db";
import { checkPassword } from "@/lib/server/password";
import { clearFailures, clientIp, ipBlocked, loadCredential, promoteLegacy, recordAttempt, saveFailure } from "@/lib/server/credentials";
import { fail, readJson } from "@/lib/server/respond";
import { clearSessionCookie, currentUser, setSessionCookie } from "@/lib/server/session";

export const dynamic = "force-dynamic";

const MAX_FAILURES = 5;
const LOCK_MS = 10 * 60 * 1000;
const WRONG = "이름 또는 PIN이 맞지 않습니다.";

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ user: null }, { status: 401 });
    return NextResponse.json({ user });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}

export async function POST(request: Request) {
  try {
    const body = await readJson<{ name?: unknown; password?: unknown }>(request);
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!name) throw new ApiError(400, "이름을 입력해 주세요.");
    if (password.length < 4 || password.length > 64) throw new ApiError(400, "PIN(또는 기존 비밀번호)을 입력해 주세요.");
    const db = requireDb();
    const ip = clientIp(request);
    if (await ipBlocked(db, ip)) throw new ApiError(429, "너무 많이 시도했습니다. 10분 뒤에 다시 해 주세요.");

    const found = await db.from("users").select("id, name").eq("name", name).maybeSingle();
    if (found.error) throw dbFailure(found.error, "login user");
    if (!found.data?.id) {
      await recordAttempt(db, ip, false);
      throw new ApiError(401, WRONG);
    }
    const user = { id: String(found.data.id), name: String(found.data.name) };

    const cred = await loadCredential(db, user.id);
    if (!cred) {
      // No first-come self-setup anymore: an admin sets the PIN (WordCatch 관리자 화면 or scripts/set-pin.mjs).
      throw new ApiError(403, "아직 PIN이 없습니다. 관리자에게 PIN을 만들어 달라고 해 주세요.");
    }
    if (cred.lockedUntil && Date.parse(cred.lockedUntil) > Date.now()) {
      throw new ApiError(429, "여러 번 틀려 10분 동안 잠겼습니다.");
    }
    if (!(await checkPassword(password, cred.hash))) {
      const failures = cred.failedCount + 1;
      const locked = failures >= MAX_FAILURES;
      await saveFailure(db, cred, locked ? 0 : failures, locked ? new Date(Date.now() + LOCK_MS).toISOString() : null);
      await recordAttempt(db, ip, false);
      throw new ApiError(401, WRONG);
    }
    await clearFailures(db, cred);
    await recordAttempt(db, ip, true);
    await promoteLegacy(db, cred);

    await db.from("users").update({ updated_at: new Date().toISOString() }).eq("id", user.id);
    const response = NextResponse.json({ user, created: false });
    setSessionCookie(response, user, cred.hash);
    return response;
  } catch (error) {
    return fail(error);
  }
}
