"use client";

import { useState } from "react";
import { useAccounts } from "@/components/AccountProvider";
import { maskCookie } from "@/lib/accounts";
import { cleanUid, isUid, serverLabel } from "@/lib/uid";

interface FoundRole {
  uid: string;
  nickname: string;
  level: number;
  regionName: string;
}

export default function AccountsPage() {
  const { ready, cloud, accounts, active, save, activate, remove } = useAccounts();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [uid, setUid] = useState("");
  const [cookie, setCookie] = useState("");
  const [roles, setRoles] = useState<FoundRole[]>([]);
  const [message, setMessage] = useState("");
  const [looking, setLooking] = useState(false);

  if (!ready) return null;

  function beginEdit(id: string) {
    const account = accounts.find((item) => item.id === id);
    if (!account) return;
    setEditingId(id);
    setLabel(account.label);
    setUid(account.uid);
    setCookie(account.cookie);
    setRoles([]);
    setMessage("");
  }

  function resetForm() {
    setEditingId(null);
    setLabel("");
    setUid("");
    setCookie("");
    setRoles([]);
    setMessage("");
  }

  async function lookup() {
    setLooking(true);
    setMessage("");
    setRoles([]);
    try {
      const response = await fetch("/api/roles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cookie }),
      });
      const json = (await response.json()) as { roles?: FoundRole[]; error?: string };
      if (!response.ok) throw new Error(json.error || "UID를 찾지 못했습니다.");
      setRoles(json.roles ?? []);
      if ((json.roles ?? []).length === 1) {
        const role = json.roles?.[0];
        if (role) {
          setUid(role.uid);
          if (!label.trim()) setLabel(role.nickname);
        }
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "UID를 찾지 못했습니다.");
    } finally {
      setLooking(false);
    }
  }

  function submit() {
    const nextUid = cleanUid(uid);
    if (!isUid(nextUid)) {
      setMessage("UID는 9자리 숫자입니다.");
      return;
    }
    save({ id: editingId ?? undefined, label, uid: nextUid, cookie });
    resetForm();
    setMessage("저장했습니다.");
  }

  return (
    <div className="space-y-4">
      <section>
        <h1 className="font-display text-2xl font-semibold">계정</h1>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {cloud === "off"
            ? "여러 UID를 이 브라우저에 저장하고 전환합니다. 데이터베이스 주소가 없으면 다른 기기와는 맞추지 않습니다."
            : "여러 UID를 저장하고 전환합니다. UID와 쿠키는 데이터베이스에 두어 다른 기기에서도 바로 열리게 합니다. 파티 구성은 각 기기에 남습니다."}
        </p>
        {cloud === "missing" && (
          <p className="mt-2 text-sm leading-6 text-destructive">
            계정 표가 아직 없습니다. Supabase SQL Editor에서 supabase-schema.sql을 실행하면 다른 기기와 맞춰집니다.
          </p>
        )}
        {cloud === "error" && (
          <p className="mt-2 text-sm leading-6 text-destructive">
            데이터베이스에 저장하지 못했습니다. 이 브라우저에는 남아 있습니다.
          </p>
        )}
      </section>

      <ul className="space-y-2">
        {accounts.length === 0 && (
          <li className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
            아직 저장된 계정이 없습니다.
          </li>
        )}
        {accounts.map((account) => (
          <li key={account.id} className="rounded-2xl border border-border bg-card p-3">
            <button type="button" className="min-h-11 w-full text-left" onClick={() => activate(account.id)}>
              <p className="truncate font-semibold">
                {account.label}
                {active?.id === account.id ? " · 사용 중" : ""}
              </p>
              <p className="truncate text-sm text-muted-foreground">
                UID {account.uid} · {serverLabel(account.uid)}
              </p>
              <p className="text-xs text-muted-foreground">{maskCookie(account.cookie)}</p>
            </button>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                className="h-11 rounded-full border border-border text-sm text-primary"
                onClick={() => beginEdit(account.id)}
              >
                수정
              </button>
              <button
                type="button"
                className="h-11 rounded-full border border-border text-sm text-destructive"
                onClick={() => remove(account.id)}
              >
                삭제
              </button>
            </div>
          </li>
        ))}
      </ul>

      <section className="space-y-3 rounded-3xl border border-border bg-card p-4">
        <h2 className="font-display text-xl font-semibold">{editingId ? "계정 수정" : "계정 추가"}</h2>
        <label className="block text-sm">
          별칭
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            className="mt-1 h-12 w-full rounded-2xl border border-input bg-background px-4 text-base"
            placeholder="아시아 본캐"
            autoComplete="off"
          />
        </label>
        <label className="block text-sm">
          UID
          <input
            value={uid}
            inputMode="numeric"
            enterKeyHint="done"
            autoComplete="off"
            onChange={(event) => setUid(cleanUid(event.target.value))}
            className="mt-1 h-12 w-full rounded-2xl border border-input bg-background px-4 text-base"
            placeholder="9자리"
          />
        </label>
        <label className="block text-sm">
          호요랩 쿠키
          <textarea
            value={cookie}
            onChange={(event) => setCookie(event.target.value)}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className="mt-1 min-h-32 w-full rounded-2xl border border-input bg-background px-4 py-3 text-base"
            placeholder="Cookie 한 줄을 그대로 붙여 넣기"
          />
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            컴퓨터 호요랩의 Cookie 한 줄을 붙여 넣습니다. 로그인에 쓰는 값이 계정과 함께 저장됩니다.
          </p>
        </label>
        <div className="grid gap-2">
          <button
            type="button"
            onClick={() => void lookup()}
            disabled={looking || !cookie.trim()}
            className="h-12 w-full rounded-full border border-border text-sm disabled:opacity-50"
          >
            {looking ? "찾는 중" : "쿠키로 UID 찾기"}
          </button>
          <button
            type="button"
            onClick={submit}
            className="h-12 w-full rounded-full bg-primary text-sm font-semibold text-primary-foreground"
          >
            저장
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="h-12 w-full rounded-full text-sm text-muted-foreground">
              취소
            </button>
          )}
        </div>
        {roles.length > 0 && (
          <div className="space-y-2">
            {roles.map((role) => (
              <button
                key={role.uid}
                type="button"
                className="block min-h-12 w-full rounded-2xl bg-secondary px-3 py-2 text-left text-sm leading-6"
                onClick={() => {
                  setUid(role.uid);
                  if (!label.trim()) setLabel(role.nickname);
                }}
              >
                {role.nickname} · UID {role.uid} · AR {role.level} · {role.regionName}
              </button>
            ))}
          </div>
        )}
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
        <details className="rounded-2xl bg-secondary/70 px-3 py-1 text-sm text-muted-foreground">
          <summary className="flex min-h-11 cursor-pointer items-center font-medium text-foreground">
            쿠키 복사하는 법
          </summary>
          <ol className="list-decimal space-y-1 pb-2 pl-5 leading-6">
            <li>
              컴퓨터에서{" "}
              <a href="https://www.hoyolab.com/" target="_blank" rel="noreferrer" className="text-primary">
                hoyolab.com
              </a>
              에 로그인한 뒤 F12를 엽니다.
            </li>
            <li>네트워크 탭을 켜고 페이지를 새로고침합니다.</li>
            <li>hoyolab.com으로 가는 요청을 하나 고르고, 요청 헤더의 Cookie 값을 통째로 복사합니다.</li>
            <li>핸드폰이라면 그 값을 옮겨 위 칸에 붙여 넣습니다.</li>
          </ol>
        </details>
      </section>

      <section className="rounded-3xl border border-border bg-card p-4 text-sm leading-6 text-muted-foreground">
        <p className="font-medium text-foreground">홈 화면에 설치</p>
        <p>Android Chrome: 메뉴 → 홈 화면에 추가 또는 앱 설치.</p>
        <p>iPhone Safari: 공유 → 홈 화면에 추가.</p>
        <p>전시 캐릭터는 게임 프로필에서 상세 정보 공개를 켜 두어야 스탯이 나옵니다.</p>
      </section>
    </div>
  );
}
