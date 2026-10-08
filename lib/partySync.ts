import { api } from "@/lib/api";
import { parsePartyFile, type PartyFile } from "@/lib/party";
import { choosePartyFile, readStoredParty, writeStoredParty } from "@/lib/partyStore";

interface RemoteParty {
  file: PartyFile;
  updatedAt: string;
}

const queues = new Map<string, Promise<void>>();

function enqueue(accountId: string, job: () => Promise<void>): Promise<void> {
  const previous = queues.get(accountId) ?? Promise.resolve();
  const next = previous.then(job, job);
  queues.set(accountId, next);
  return next;
}

async function fetchParty(accountId: string): Promise<{ ok: boolean; party: RemoteParty | null }> {
  const result = await api<{ party: RemoteParty | null }>(`/api/parties?accountId=${encodeURIComponent(accountId)}`);
  if (!result.ok) return { ok: false, party: null };
  const party = result.data.party;
  if (!party || typeof party.updatedAt !== "string" || !party.file) return { ok: true, party: null };
  return { ok: true, party: { file: parsePartyFile(JSON.stringify(party.file)), updatedAt: party.updatedAt } };
}

async function upsertParty(accountId: string, file: PartyFile, updatedAt: string): Promise<boolean> {
  const result = await api("/api/parties", { method: "PUT", body: { accountId, data: file, updatedAt } });
  return result.ok;
}

/** Resolves false when the server did not keep the change. The browser copy stays either way. */
export function queuePartySave(accountId: string, file: PartyFile, updatedAt: string): Promise<boolean> {
  let saved = true;
  return enqueue(accountId, async () => {
    if (readStoredParty(accountId).updatedAt !== updatedAt) return;
    saved = await upsertParty(accountId, file, updatedAt);
  }).then(() => saved);
}

export function reconcileParty(accountId: string): Promise<PartyFile> {
  let result = readStoredParty(accountId).file;
  return enqueue(accountId, async () => {
    const local = readStoredParty(accountId);
    const remote = await fetchParty(accountId);
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
    const saved = await upsertParty(accountId, choice.file, updatedAt);
    result = saved ? choice.file : local.file;
  }).then(() => result);
}

export async function syncAccountParties(accountIds: string[]): Promise<void> {
  for (const accountId of accountIds) await reconcileParty(accountId);
}
