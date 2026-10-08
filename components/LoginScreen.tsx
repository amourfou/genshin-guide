"use client";

import { FormEvent, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function LoginScreen({ onLogin }: { onLogin: (name: string) => Promise<{ ok: boolean; error?: string }> }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const result = await onLogin(name);
    setBusy(false);
    if (!result.ok) setError(result.error || "로그인하지 못했습니다.");
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
        <h1 className="mt-2 text-xl font-semibold">로그인</h1>
        <label className="mt-6 block text-sm">
          이름
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="username"
            autoCapitalize="off"
            className="mt-1 h-12 w-full rounded-2xl border border-input bg-background px-4 text-base"
            placeholder="이름"
          />
        </label>
        {error && <p className="mt-3 text-sm leading-6 text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="mt-5 h-12 rounded-full bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {busy ? "확인 중" : "들어가기"}
        </button>
      </form>
    </div>
  );
}
