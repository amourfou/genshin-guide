import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let admin: SupabaseClient | null | undefined;

/** Service-role client. Only API routes use it; RLS gives anon no access to the private tables. */
export function adminDb(): SupabaseClient | null {
  if (admin !== undefined) return admin;
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  admin = url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
  return admin;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

export function requireDb(): SupabaseClient {
  const db = adminDb();
  if (!db) throw new ApiError(503, "서버에 저장소 키(SUPABASE_SERVICE_ROLE_KEY)가 없어 연결하지 못했습니다.");
  return db;
}

export function dbFailure(error: { message?: string; code?: string } | null, context: string): ApiError {
  console.error(`db ${context} failed`, error?.code ?? "", error?.message ?? "");
  return new ApiError(500, "저장소 요청에 실패했습니다. 잠시 뒤 다시 시도하세요.");
}
