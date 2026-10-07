import { NextResponse } from "next/server";
import { fetchRoles, HoyolabError, sanitizeCookie } from "@/lib/hoyolab";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { cookie?: string };
  try {
    body = (await request.json()) as { cookie?: string };
  } catch {
    return NextResponse.json({ error: "요청 형식이 잘못되었습니다." }, { status: 400 });
  }

  try {
    const cookie = sanitizeCookie(String(body.cookie ?? ""));
    const roles = await fetchRoles(cookie);
    if (roles.length === 0) {
      return NextResponse.json(
        { error: "이 쿠키에 연결된 원신 UID가 없습니다." },
        { status: 404 }
      );
    }
    return NextResponse.json({ roles });
  } catch (error) {
    const message = error instanceof HoyolabError || error instanceof Error
      ? error.message
      : "UID를 찾지 못했습니다.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
