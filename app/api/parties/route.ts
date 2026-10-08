import { NextResponse } from "next/server";
import { ApiError } from "@/lib/server/db";
import { readParty, writeParty } from "@/lib/server/parties";
import { fail, readJson } from "@/lib/server/respond";
import { requireUser } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const accountId = new URL(request.url).searchParams.get("accountId") ?? "";
    if (!accountId) throw new ApiError(400, "계정을 고르세요.");
    return NextResponse.json({ party: await readParty(user.id, accountId) });
  } catch (error) {
    return fail(error);
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireUser();
    const body = await readJson<{ accountId?: unknown; data?: unknown; updatedAt?: unknown }>(request);
    if (typeof body.accountId !== "string" || !body.accountId) throw new ApiError(400, "계정을 고르세요.");
    await writeParty(user.id, body.accountId, body.data, body.updatedAt);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
