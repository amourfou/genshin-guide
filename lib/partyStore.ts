import { parsePartyFile, type PartyFile, type SavedParty } from "@/lib/party";

export function partyStorageKey(accountId: string): string {
  return `genshin-party:${accountId}`;
}

export interface StoredParty {
  present: boolean;
  file: PartyFile;
  updatedAt: string | null;
}

export function readStoredParty(accountId: string): StoredParty {
  if (typeof window === "undefined") return { present: false, file: parsePartyFile(null), updatedAt: null };
  const raw = localStorage.getItem(partyStorageKey(accountId));
  if (!raw) return { present: false, file: parsePartyFile(null), updatedAt: null };
  let updatedAt: string | null = null;
  try {
    const parsed = JSON.parse(raw) as { updatedAt?: unknown };
    if (typeof parsed.updatedAt === "string") updatedAt = parsed.updatedAt;
  } catch {
    updatedAt = null;
  }
  return { present: true, file: parsePartyFile(raw), updatedAt };
}

export function writeStoredParty(accountId: string, file: PartyFile, updatedAt = new Date().toISOString()): string {
  localStorage.setItem(partyStorageKey(accountId), JSON.stringify({ ...file, updatedAt }));
  return updatedAt;
}

function filledSlots(party: SavedParty): number {
  return party.slots.filter((slot) => slot != null).length;
}

export function partyFileHasMembers(file: PartyFile): boolean {
  if (file.parties.length > 1) return true;
  const party = file.parties[0];
  if (!party) return false;
  if (party.name !== "파티 1") return true;
  return filledSlots(party) > 0;
}

export function mergePartyFiles(local: PartyFile, remote: PartyFile): PartyFile {
  const byId = new Map<string, SavedParty>();
  for (const party of remote.parties) byId.set(party.id, party);
  for (const party of local.parties) {
    const previous = byId.get(party.id);
    if (!previous || filledSlots(party) >= filledSlots(previous)) byId.set(party.id, party);
  }
  const remoteIds = remote.parties.map((party) => party.id);
  const localOnly = local.parties.filter((party) => !remoteIds.includes(party.id));
  const parties = [...remote.parties.map((party) => byId.get(party.id) ?? party), ...localOnly].slice(0, 8);
  const preferred = [local.activeId, remote.activeId].find((id) => parties.some((party) => party.id === id));
  return { activeId: preferred ?? parties[0]?.id ?? local.activeId, parties };
}

export function choosePartyFile(
  local: StoredParty,
  remote: { file: PartyFile; updatedAt: string } | null
): { file: PartyFile; upload: boolean } {
  if (!remote) return { file: local.file, upload: local.present };
  if (!local.present || !partyFileHasMembers(local.file)) return { file: remote.file, upload: false };
  if (!partyFileHasMembers(remote.file)) return { file: local.file, upload: true };
  const localTime = local.updatedAt ? Date.parse(local.updatedAt) : Number.NaN;
  const remoteTime = Date.parse(remote.updatedAt);
  if (Number.isFinite(localTime) && Number.isFinite(remoteTime)) {
    return localTime >= remoteTime ? { file: local.file, upload: localTime > remoteTime } : { file: remote.file, upload: false };
  }
  const file = mergePartyFiles(local.file, remote.file);
  return { file, upload: true };
}
