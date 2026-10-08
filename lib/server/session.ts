import "server-only";
import crypto from "crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { ApiError, dbFailure, requireDb } from "@/lib/server/db";

const COOKIE = "genshin_session";
const MAX_AGE_S = 60 * 60 * 24 * 180;

export interface SessionUser {
  id: string;
  name: string;
}

interface Token {
  u: string;
  n: string;
  /** Fingerprint of the password hash. Changing or deleting the password ends old sessions. */
  p: string;
  iat: number;
}

function key(): Buffer {
  const raw = process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!raw) throw new ApiError(503, "서버에 세션 키가 없어 로그인할 수 없습니다.");
  return crypto.createHash("sha256").update(`genshin-session:${raw}`).digest();
}

function mac(body: string): string {
  return crypto.createHmac("sha256", key()).update(body).digest("base64url");
}

export function passwordFingerprint(hash: string): string {
  return crypto.createHash("sha256").update(hash).digest("base64url").slice(0, 16);
}

function sign(token: Token): string {
  const body = Buffer.from(JSON.stringify(token)).toString("base64url");
  return `${body}.${mac(body)}`;
}

function verify(raw: string | undefined): Token | null {
  if (!raw) return null;
  const [body, sig] = raw.split(".");
  if (!body || !sig) return null;
  const expected = Buffer.from(mac(body));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  try {
    const token = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Token;
    if (!token.u || !token.n || !token.p || !Number.isFinite(token.iat)) return null;
    if (Date.now() / 1000 - token.iat > MAX_AGE_S) return null;
    return token;
  } catch {
    return null;
  }
}

export function setSessionCookie(response: NextResponse, user: SessionUser, passwordHash: string): void {
  const token = sign({ u: user.id, n: user.name, p: passwordFingerprint(passwordHash), iat: Math.floor(Date.now() / 1000) });
  response.cookies.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_S,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

/** Signed cookie plus a check that the password it was issued for is still current. */
export async function currentUser(): Promise<SessionUser | null> {
  const token = verify(cookies().get(COOKIE)?.value);
  if (!token) return null;
  const db = requireDb();
  const { data, error } = await db
    .from("genshin_logins")
    .select("secret_hash")
    .eq("user_id", token.u)
    .maybeSingle();
  if (error) throw dbFailure(error, "session");
  if (!data?.secret_hash || passwordFingerprint(data.secret_hash) !== token.p) return null;
  return { id: token.u, name: token.n };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) throw new ApiError(401, "다시 로그인해 주세요.");
  return user;
}
