/** JSON fetch for the app's own API routes. Never throws; failures carry a Korean message. */
export async function api<T>(
  path: string,
  init: { method?: string; body?: unknown; signal?: AbortSignal } = {}
): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string; data?: Record<string, unknown> }> {
  try {
    const response = await fetch(path, {
      method: init.method ?? "GET",
      headers: init.body === undefined ? undefined : { "content-type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      credentials: "same-origin",
      cache: "no-store",
      signal: init.signal,
    });
    const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      const error = typeof json.error === "string" ? json.error : `요청 실패 (${response.status})`;
      return { ok: false, status: response.status, error, data: json };
    }
    return { ok: true, data: json as T };
  } catch (error) {
    if (init.signal?.aborted) return { ok: false, status: 0, error: "취소됨" };
    return { ok: false, status: 0, error: error instanceof Error && error.message ? "네트워크에 연결하지 못했습니다." : "요청에 실패했습니다." };
  }
}
