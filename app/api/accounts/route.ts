import { NextResponse } from "next/server";
import { deleteAccount, listAccounts, saveAccount, type SaveInput } from "@/lib/server/accounts";
import { ApiError } from "@/lib/server/db";
import { fail, readJson } from "@/lib/server/respond";
import { requireUser } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json(await listAccounts(user.id));
  } catch (error) {
    return fail(error);
  }
}

/** Create or update one account. Other rows are never touched. */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await readJson<SaveInput>(request);
    const account = await saveAccount(user.id, {
      id: typeof body.id === "string" ? body.id : undefined,
      label: typeof body.label === "string" ? body.label : "",
      uid: typeof body.uid === "string" ? body.uid : "",
      cookie: typeof body.cookie === "string" ? body.cookie : undefined,
      clearCookie: body.clearCookie === true,
      migrate: body.migrate === true,
    });
    return NextResponse.json({ account, list: await listAccounts(user.id) });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireUser();
    const id = new URL(request.url).searchParams.get("id") ?? "";
    if (!id) throw new ApiError(400, "삭제할 계정이 없습니다.");
    await deleteAccount(user.id, id);
    return NextResponse.json(await listAccounts(user.id));
  } catch (error) {
    return fail(error);
  }
}
