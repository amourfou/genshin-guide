import "server-only";
import { parsePartyFile, type PartyFile } from "@/lib/party";
import { ApiError, dbFailure, requireDb } from "@/lib/server/db";

async function assertOwned(userId: string, accountId: string): Promise<void> {
  const { data, error } = await requireDb()
    .from("genshin_accounts")
    .select("id")
    .eq("id", accountId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw dbFailure(error, "party owner");
  if (!data) throw new ApiError(404, "계정을 찾지 못했습니다.");
}

export async function readParty(userId: string, accountId: string): Promise<{ file: PartyFile; updatedAt: string } | null> {
  await assertOwned(userId, accountId);
  const { data, error } = await requireDb()
    .from("genshin_parties")
    .select("data, updated_at")
    .eq("user_id", userId)
    .eq("account_id", accountId)
    .maybeSingle();
  if (error) throw dbFailure(error, "party read");
  if (!data || typeof data.updated_at !== "string") return null;
  const raw = data.data as { parties?: unknown } | null;
  if (!raw || !Array.isArray(raw.parties)) return null;
  return { file: parsePartyFile(JSON.stringify(raw)), updatedAt: data.updated_at };
}

export async function writeParty(userId: string, accountId: string, data: unknown, updatedAt: unknown): Promise<void> {
  if (typeof updatedAt !== "string" || !Number.isFinite(Date.parse(updatedAt))) throw new ApiError(400, "저장 시각이 잘못되었습니다.");
  const text = JSON.stringify(data ?? null);
  if (text.length > 20000) throw new ApiError(400, "파티 정보가 너무 큽니다.");
  const file = parsePartyFile(text);
  await assertOwned(userId, accountId);
  const { error } = await requireDb()
    .from("genshin_parties")
    .upsert({ account_id: accountId, user_id: userId, data: file, updated_at: updatedAt });
  if (error) throw dbFailure(error, "party write");
}
