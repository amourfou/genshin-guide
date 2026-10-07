import { isUid } from "@/lib/uid";

export class EnkaError extends Error {}

export async function fetchEnka(uid: string): Promise<unknown | null> {
  if (!isUid(uid)) throw new EnkaError("UID는 9자리입니다.");
  const response = await fetch(`https://enka.network/api/uid/${uid}`, {
    headers: {
      "User-Agent": "genshin-guide/0.1 (personal build tracker)",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(20000),
    cache: "no-store",
  });
  if (response.status === 400 || response.status === 404) {
    throw new EnkaError("이 UID의 프로필 전시를 읽지 못했습니다. 게임에서 상세 정보 공개를 켜 두었는지 확인하세요.");
  }
  if (response.status === 424 || response.status === 500) {
    throw new EnkaError("Enka가 게임 서버에서 전시를 아직 받지 못했습니다. 몇 분 뒤 다시 시도하세요.");
  }
  if (response.status === 429) {
    throw new EnkaError("Enka 요청이 너무 잦습니다. 1분 뒤에 다시 시도하세요.");
  }
  if (!response.ok) {
    throw new EnkaError(`Enka 응답 ${response.status}`);
  }
  return response.json();
}
