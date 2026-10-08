import { NextResponse } from "next/server";
import { listAccounts, setActive } from "@/lib/server/accounts";
import { ApiError } from "@/lib/server/db";
import { fail, readJson } from "@/lib/server/respond";
import { requireUser } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await readJson<{ id?: unknown }>(request);
    if (typeof body.id !== "string" || !body.id) throw new ApiError(400, "계정을 고르세요.");
    await setActive(user.id, body.id);
    return NextResponse.json(await listAccounts(user.id));
  } catch (error) {
    return fail(error);
  }
}
