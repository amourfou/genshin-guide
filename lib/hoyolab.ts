import crypto from "crypto";
import { genshinServer, isChineseUid, isUid } from "@/lib/uid";

const OS_SALT = "6s25p5ox5y14umn1p61aqyyvbvvl3lrt";
const CN_SALT = "xV8v4Qu54lUKrEYFZkJhB8cuOh9Asafs";

const OS_RECORD = "https://sg-public-api.hoyolab.com/event/game_record/genshin/api/";
const CN_RECORD = "https://api-takumi-record.mihoyo.com/game_record/app/genshin/api/";

export interface HoyolabRole {
  uid: string;
  nickname: string;
  level: number;
  region: string;
  regionName: string;
}

export class HoyolabError extends Error {
  constructor(
    message: string,
    readonly retcode?: number
  ) {
    super(message);
  }
}

export function sanitizeCookie(raw: string): string {
  const trimmed = raw.replace(/[\r\n]/g, " ").trim();
  if (trimmed.length < 8 || trimmed.length > 8000) {
    throw new HoyolabError("쿠키 형식이 너무 짧거나 깁니다.");
  }
  if (!/=/.test(trimmed)) {
    throw new HoyolabError("ltuid=값; ltoken=값 형태로 붙여 넣으세요.");
  }
  return trimmed;
}

function randomString(length: number, alphabet: string): string {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

function dsOverseas(): string {
  const t = Math.floor(Date.now() / 1000);
  const r = randomString(6, "abcdefghijklmnopqrstuvwxyz");
  const h = crypto.createHash("md5").update(`salt=${OS_SALT}&t=${t}&r=${r}`).digest("hex");
  return `${t},${r},${h}`;
}

function dsChinese(bodyText: string, params: Record<string, string>): string {
  const t = Math.floor(Date.now() / 1000);
  const r = randomString(6, "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789");
  const q = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  const h = crypto
    .createHash("md5")
    .update(`salt=${CN_SALT}&t=${t}&r=${r}&b=${bodyText}&q=${q}`)
    .digest("hex");
  return `${t},${r},${h}`;
}

async function hoyoFetch(
  url: string,
  cookie: string,
  chinese: boolean,
  init: { method?: "GET" | "POST"; params?: Record<string, string>; body?: unknown }
): Promise<unknown> {
  const params = init.params ?? {};
  const bodyText = init.body === undefined ? "" : JSON.stringify(init.body);
  const query = Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
  const full = query ? `${url}?${query}` : url;
  const headers: Record<string, string> = {
    Cookie: cookie,
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
    Accept: "application/json",
    "x-rpc-app_version": chinese ? "2.11.1" : "1.5.0",
    "x-rpc-client_type": "5",
    "x-rpc-language": "ko-kr",
    "x-rpc-lang": "ko-kr",
    ds: chinese ? dsChinese(bodyText, params) : dsOverseas(),
    Referer: chinese ? "https://webstatic.mihoyo.com/" : "https://act.hoyolab.com/",
    Origin: chinese ? "https://webstatic.mihoyo.com" : "https://act.hoyolab.com",
  };
  if (init.body !== undefined) headers["Content-Type"] = "application/json";

  const response = await fetch(full, {
    method: init.method ?? "GET",
    headers,
    body: init.body === undefined ? undefined : bodyText,
    signal: AbortSignal.timeout(20000),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new HoyolabError(`호요랩 응답 ${response.status}`);
  }
  const json = (await response.json()) as { retcode?: number; message?: string; data?: unknown };
  if (json.retcode !== 0) {
    throw new HoyolabError(koreanRetcode(json.retcode, json.message), json.retcode);
  }
  return json.data;
}

function koreanRetcode(retcode: number | undefined, message: string | undefined): string {
  if (retcode === 10102) return "배틀 연대기가 비공개입니다. 호요랩에서 공개로 바꾸세요.";
  if (retcode === -100 || retcode === 10001) return "쿠키가 만료됐거나 빠졌습니다. 다시 로그인하고 쿠키를 복사하세요.";
  if (retcode === 10101) return "호요랩이 요청을 거절했습니다. 잠시 뒤 다시 시도하세요.";
  if (retcode === 1034) return "호요랩 보안 확인이 떴습니다. 브라우저에서 호요랩을 한 번 연 뒤 다시 시도하세요.";
  return message ? `호요랩 오류 (${retcode ?? "?"}): ${message}` : "호요랩 요청에 실패했습니다.";
}

export async function fetchRoles(cookie: string): Promise<HoyolabRole[]> {
  const safe = sanitizeCookie(cookie);
  const attempts: Array<{ url: string; chinese: boolean; biz: string }> = [
    {
      url: "https://api-account-os.hoyolab.com/binding/api/getUserGameRolesByCookie",
      chinese: false,
      biz: "hk4e_global",
    },
    {
      url: "https://api-takumi.mihoyo.com/binding/api/getUserGameRolesByCookie",
      chinese: true,
      biz: "hk4e_cn",
    },
  ];
  let last: Error | null = null;
  for (const attempt of attempts) {
    try {
      const data = (await hoyoFetch(attempt.url, safe, attempt.chinese, {
        params: { game_biz: attempt.biz },
      })) as { list?: Array<Record<string, unknown>> };
      const list = data?.list ?? [];
      return list.map((role) => ({
        uid: String(role.game_uid ?? ""),
        nickname: String(role.nickname ?? ""),
        level: Number(role.level ?? 0),
        region: String(role.region ?? ""),
        regionName: String(role.region_name ?? ""),
      })).filter((role) => isUid(role.uid));
    } catch (error) {
      last = error instanceof Error ? error : new Error(String(error));
    }
  }
  throw last ?? new HoyolabError("연결된 원신 계정을 찾지 못했습니다.");
}

function recordBase(uid: string): { base: string; chinese: boolean } {
  return isChineseUid(uid)
    ? { base: CN_RECORD, chinese: true }
    : { base: OS_RECORD, chinese: false };
}

export async function fetchHoyolabBundle(uid: string, cookie: string): Promise<{
  index: unknown;
  characters: unknown;
  abyss: unknown;
  theater: unknown;
}> {
  if (!isUid(uid)) throw new HoyolabError("UID는 9자리입니다.");
  const safe = sanitizeCookie(cookie);
  const { base, chinese } = recordBase(uid);
  const server = genshinServer(uid);
  const params = { server, role_id: uid };

  const index = await hoyoFetch(`${base}index`, safe, chinese, { params });
  const listData = (await hoyoFetch(`${base}character/list`, safe, chinese, {
    method: "POST",
    body: { role_id: Number(uid), server },
  })) as { list?: Array<{ id?: number }> };
  const ids = (listData?.list ?? []).map((item) => Number(item.id)).filter((id) => Number.isFinite(id));

  let characters: unknown = { list: [] };
  if (ids.length > 0) {
    const chunks: number[][] = [];
    for (let i = 0; i < ids.length; i += 20) chunks.push(ids.slice(i, i + 20));
    const lists: unknown[] = [];
    let propertyMap: unknown = {};
    for (const chunk of chunks) {
      const detail = (await hoyoFetch(`${base}character/detail`, safe, chinese, {
        method: "POST",
        body: { role_id: Number(uid), server, character_ids: chunk },
      })) as { list?: unknown[]; property_map?: unknown };
      lists.push(...(detail?.list ?? []));
      propertyMap = detail?.property_map ?? propertyMap;
    }
    characters = { list: lists, property_map: propertyMap };
  }

  const [abyss, theater] = await Promise.all([
    hoyoFetch(`${base}spiralAbyss`, safe, chinese, {
      params: { ...params, schedule_type: "1" },
    }).catch(() => null),
    hoyoFetch(`${base}role_combat`, safe, chinese, {
      params: { ...params, need_detail: "true" },
    }).catch(() => null),
  ]);

  return { index, characters, abyss, theater };
}
