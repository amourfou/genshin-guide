import "server-only";
import { NextResponse } from "next/server";
import { ApiError } from "@/lib/server/db";
import { HoyolabError } from "@/lib/hoyolab";

export function fail(error: unknown): NextResponse {
  if (error instanceof ApiError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof HoyolabError) return NextResponse.json({ error: error.message }, { status: 400 });
  console.error("api failed", error instanceof Error ? error.message : error);
  return NextResponse.json({ error: "요청을 처리하지 못했습니다." }, { status: 500 });
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new ApiError(400, "요청 형식이 잘못되었습니다.");
  }
}
