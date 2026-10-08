import { NextResponse } from "next/server";
import { ApiError, dbFailure, requireDb } from "@/lib/server/db";
import { checkPassword, hashPassword } from "@/lib/server/password";
import { fail, readJson } from "@/lib/server/respond";
import { clearSessionCookie, currentUser, setSessionCookie } from "@/lib/server/session";

export const dynamic = "force-dynamic";

const MAX_FAILURES = 5;
const LOCK_MS = 10 * 60 * 1000;
const WRONG = "이름 또는 비밀번호가 맞지 않습니다.";

interface LoginRow {
  user_id: string;
  secret_hash: string;
  failed_count: number | null;
  locked_until: string | null;
}

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
    const body = await readJson<{ name?: unknown; password?: unknown; setup?: unknown }>(request);
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!name) throw new ApiError(400, "이름을 입력해 주세요.");
    if (password.length < 4 || password.length > 64) throw new ApiError(400, "비밀번호는 4~64자입니다.");
    const db = requireDb();

    const found = await db.from("users").select("id, name").eq("name", name).maybeSingle();
    if (found.error) throw dbFailure(found.error, "login user");
    if (!found.data?.id) throw new ApiError(401, WRONG);
    const user = { id: String(found.data.id), name: String(found.data.name) };

    const login = await db
      .from("genshin_logins")
      .select("user_id, secret_hash, failed_count, locked_until")
      .eq("user_id", user.id)
      .maybeSingle();
    if (login.error) throw dbFailure(login.error, "login read");
    const row = login.data as LoginRow | null;
    let hash: string;
    let created = false;

    if (!row) {
      // First login for this name: the password typed twice becomes this name's password.
      if (body.setup !== true) {
        return NextResponse.json(
          { error: "처음 들어오는 이름입니다. 앞으로 쓸 비밀번호를 한 번 더 입력해 정하세요.", needsSetup: true },
          { status: 409 }
        );
      }
      hash = await hashPassword(password);
      const inserted = await db.from("genshin_logins").insert({ user_id: user.id, secret_hash: hash, failed_count: 0 });
      if (inserted.error) {
        if (inserted.error.code === "23505") throw new ApiError(409, "방금 다른 기기에서 비밀번호를 정했습니다. 그 비밀번호로 들어오세요.");
        throw dbFailure(inserted.error, "login create");
      }
      created = true;
    } else {
      if (row.locked_until && Date.parse(row.locked_until) > Date.now()) {
        throw new ApiError(429, "비밀번호를 여러 번 틀려 10분 동안 잠겼습니다.");
      }
      if (!(await checkPassword(password, row.secret_hash))) {
        const failures = (row.failed_count ?? 0) + 1;
        const locked = failures >= MAX_FAILURES;
        await db
          .from("genshin_logins")
          .update({
            failed_count: locked ? 0 : failures,
            locked_until: locked ? new Date(Date.now() + LOCK_MS).toISOString() : null,
          })
          .eq("user_id", user.id);
        throw new ApiError(401, WRONG);
      }
      hash = row.secret_hash;
      if (row.failed_count || row.locked_until) {
        await db.from("genshin_logins").update({ failed_count: 0, locked_until: null }).eq("user_id", user.id);
      }
    }

    await db.from("users").update({ updated_at: new Date().toISOString() }).eq("id", user.id);
    const response = NextResponse.json({ user, created });
    setSessionCookie(response, user, hash);
    return response;
  } catch (error) {
    return fail(error);
  }
}
