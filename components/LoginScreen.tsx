"use client";

import { FormEvent, useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import type { LoginResult } from "@/lib/session";

export function LoginScreen({
  onLogin,
  savedName,
  problem,
}: {
  onLogin: (name: string, password: string, setup: boolean) => Promise<LoginResult>;
  savedName: string;
  problem: string;
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [setup, setSetup] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (savedName) setName((current) => current || savedName);
  }, [savedName]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (setup && password !== confirm) {
      setError("두 비밀번호가 다릅니다.");
      return;
    }
    setBusy(true);
    const result = await onLogin(name, password, setup);
    setBusy(false);
    if (result.ok) return;
    if (result.needsSetup) {
      setSetup(true);
      setConfirm("");
      setNotice(result.error);
      return;
    }
    setError(result.error || "로그인하지 못했습니다.");
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col md:border-x md:border-border/70">
      <div className="safe-top safe-x flex justify-end">
        <button
          type="button"
          className="grid h-11 w-11 place-items-center rounded-full"
          aria-label="테마 전환"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          <Sun className="h-5 w-5 dark:hidden" />
          <Moon className="hidden h-5 w-5 dark:block" />
        </button>
      </div>
      <form onSubmit={submit} className="safe-x flex flex-1 flex-col justify-center pb-16">
        <p className="font-display text-2xl font-semibold text-primary">원신 가이드</p>
        <h1 className="mt-2 text-xl font-semibold">{setup ? "비밀번호 정하기" : "로그인"}</h1>
        <input
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setSetup(false);
            setNotice("");
          }}
          autoComplete="username"
          autoCapitalize="off"
          aria-label="이름"
          className="mt-6 h-12 w-full rounded-2xl border border-input bg-background px-4 text-base"
          placeholder="이름"
        />
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          autoComplete={setup ? "new-password" : "current-password"}
          aria-label="비밀번호"
          className="mt-3 h-12 w-full rounded-2xl border border-input bg-background px-4 text-base"
          placeholder="비밀번호 (4자 이상)"
        />
        {setup && (
          <input
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            type="password"
            autoComplete="new-password"
            aria-label="비밀번호 확인"
            className="mt-3 h-12 w-full rounded-2xl border border-input bg-background px-4 text-base"
            placeholder="비밀번호 한 번 더"
          />
        )}
        {notice && <p className="mt-3 text-sm leading-6 text-muted-foreground">{notice}</p>}
        {(error || problem) && <p className="mt-3 text-sm leading-6 text-destructive">{error || problem}</p>}
        <button
          type="submit"
          disabled={busy || !name.trim() || password.length < 4 || (setup && confirm.length < 4)}
          className="mt-5 h-12 rounded-full bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {busy ? "확인 중" : setup ? "비밀번호 정하고 들어가기" : "들어가기"}
        </button>
        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          처음 들어오는 이름이면 여기서 정한 비밀번호가 그 이름의 비밀번호가 됩니다. 잊으면 관리자가 지워야 다시 정할 수 있습니다.
        </p>
      </form>
    </div>
  );
}
