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
  const { ready, accounts, active, save, activate, remove } = useAccounts();
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
    setMessage("이 브라우저에 저장했습니다.");
  }

  return (
    <div className="space-y-4">
      <section>
        <h1 className="font-display text-2xl font-semibold">계정</h1>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          여러 UID를 저장하고 전환합니다. 쿠키는 이 브라우저의 로컬 저장소에만 있고, 공략 데이터베이스에는 들어가지 않습니다.
          공용 컴퓨터에서는 계정을 지우세요.
        </p>
      </section>

      <ul className="space-y-2">
        {accounts.length === 0 && (
          <li className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
            아직 저장된 계정이 없습니다.
          </li>
        )}
        {accounts.map((account) => (
          <li key={account.id} className="rounded-2xl border border-border bg-card p-3">
            <div className="flex items-start justify-between gap-3">
              <button type="button" className="min-w-0 text-left" onClick={() => activate(account.id)}>
                <p className="font-semibold">
                  {account.label}
                  {active?.id === account.id ? " · 사용 중" : ""}
                </p>
                <p className="text-sm text-muted-foreground">
                  UID {account.uid} · {serverLabel(account.uid)}
                </p>
                <p className="text-xs text-muted-foreground">{maskCookie(account.cookie)}</p>
              </button>
              <div className="flex shrink-0 gap-2">
                <button type="button" className="text-sm text-primary" onClick={() => beginEdit(account.id)}>
                  수정
                </button>
                <button
                  type="button"
                  className="text-sm text-destructive"
                  onClick={() => remove(account.id)}
                >
                  삭제
                </button>
              </div>
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
            className="mt-1 h-11 w-full rounded-2xl border border-input bg-background px-3"
            placeholder="아시아 본캐"
          />
        </label>
        <label className="block text-sm">
          UID
          <input
            value={uid}
            inputMode="numeric"
            onChange={(event) => setUid(cleanUid(event.target.value))}
            className="mt-1 h-11 w-full rounded-2xl border border-input bg-background px-3"
            placeholder="9자리"
          />
        </label>
        <label className="block text-sm">
          호요랩 쿠키
          <textarea
            value={cookie}
            onChange={(event) => setCookie(event.target.value)}
            className="mt-1 min-h-28 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
            placeholder="ltuid_v2=...; ltoken_v2=..."
          />
        </label>
        <ol className="list-decimal space-y-1 pl-5 text-xs leading-5 text-muted-foreground">
          <li>hoyolab.com에 로그인한 뒤 F12를 엽니다.</li>
          <li>애플리케이션 → 쿠키 → www.hoyolab.com.</li>
          <li>ltuid_v2와 ltoken_v2를 복사합니다. 없으면 ltuid, ltoken입니다.</li>
          <li>위 칸에 ltuid_v2=값; ltoken_v2=값 형태로 붙입니다.</li>
        </ol>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void lookup()}
            disabled={looking || !cookie.trim()}
            className="h-11 rounded-full border border-border px-4 text-sm disabled:opacity-50"
          >
            {looking ? "찾는 중" : "쿠키로 UID 찾기"}
          </button>
          <button
            type="button"
            onClick={submit}
            className="h-11 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            저장
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="h-11 px-3 text-sm text-muted-foreground">
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
                className="block w-full rounded-2xl bg-secondary px-3 py-2 text-left text-sm"
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
