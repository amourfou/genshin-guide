import { parsePartyFile, type PartyFile } from "@/lib/party";
import { choosePartyFile, readStoredParty, writeStoredParty } from "@/lib/partyStore";
import { supabase } from "@/lib/supabase";

interface RemoteParty {
  file: PartyFile;
  updatedAt: string;
}

const queues = new Map<string, Promise<void>>();

function missingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "PGRST205" || error.code === "42P01" || error.code === "PGRST204") return true;
  return /schema cache|does not exist|Could not find the table|Could not find the '.+' column/i.test(error.message ?? "");
}

function fileFromRemote(data: unknown): PartyFile | null {
  if (!data || typeof data !== "object" || !Array.isArray((data as { parties?: unknown }).parties)) return null;
  return parsePartyFile(JSON.stringify(data));
}

function enqueue(accountId: string, job: () => Promise<void>): Promise<void> {
  const previous = queues.get(accountId) ?? Promise.resolve();
  const next = previous.then(job, job);
  queues.set(accountId, next);
  return next;
}

async function fetchParty(userId: string, accountId: string): Promise<{ ok: boolean; party: RemoteParty | null }> {
  if (!supabase) return { ok: false, party: null };
  const { data, error } = await supabase
    .from("genshin_parties")
    .select("data, updated_at")
    .eq("user_id", userId)
    .eq("account_id", accountId)
    .maybeSingle();
  if (error || missingTable(error)) return { ok: false, party: null };
  if (!data || typeof data.updated_at !== "string") return { ok: true, party: null };
  const file = fileFromRemote(data.data);
  if (!file) return { ok: true, party: null };
  return { ok: true, party: { file, updatedAt: data.updated_at } };
}

async function upsertParty(userId: string, accountId: string, file: PartyFile, updatedAt: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("genshin_parties").upsert({
    account_id: accountId,
    user_id: userId,
    data: file,
    updated_at: updatedAt,
  });
  return !error;
}

export function queuePartySave(userId: string, accountId: string, file: PartyFile, updatedAt: string): Promise<void> {
  return enqueue(accountId, async () => {
    if (readStoredParty(accountId).updatedAt !== updatedAt) return;
    await upsertParty(userId, accountId, file, updatedAt);
  });
}

export function reconcileParty(userId: string, accountId: string): Promise<PartyFile> {
  let result = readStoredParty(accountId).file;
  return enqueue(accountId, async () => {
    const local = readStoredParty(accountId);
    const remote = await fetchParty(userId, accountId);
    if (!remote.ok) {
      result = local.file;
      return;
    }
    if (readStoredParty(accountId).updatedAt !== local.updatedAt) {
      result = readStoredParty(accountId).file;
      return;
    }
    const choice = choosePartyFile(local, remote.party);
    if (!choice.upload) {
      if (remote.party) writeStoredParty(accountId, choice.file, remote.party.updatedAt);
      result = choice.file;
      return;
    }
    const updatedAt = writeStoredParty(accountId, choice.file);
    const saved = await upsertParty(userId, accountId, choice.file, updatedAt);
    result = saved ? choice.file : local.file;
  }).then(() => result);
}

export async function syncAccountParties(userId: string, accountIds: string[]): Promise<void> {
  for (const accountId of accountIds) await reconcileParty(userId, accountId);
}

export async function deleteParty(userId: string, accountId: string): Promise<void> {
  if (!supabase) return;
  await enqueue(accountId, async () => {
    await supabase!.from("genshin_parties").delete().eq("user_id", userId).eq("account_id", accountId);
  });
}
