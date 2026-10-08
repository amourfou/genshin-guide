"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Check, ChevronDown, Home, Moon, Sun, Swords, User, Users } from "lucide-react";
import { useTheme } from "next-themes";
import { useAccounts } from "@/components/AccountProvider";
import { LoginScreen } from "@/components/LoginScreen";
import { useProfile } from "@/components/ProfileProvider";
import { useSession } from "@/components/SessionProvider";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "홈", icon: Home },
  { href: "/characters", label: "캐릭터", icon: Users },
  { href: "/party", label: "파티", icon: Swords },
  { href: "/accounts", label: "계정", icon: User },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { ready: sessionReady, user, login, logout, savedName, problem } = useSession();
  const { accounts, active, activate } = useAccounts();
  const { profile } = useProfile();
  const { resolvedTheme, setTheme } = useTheme();
  const [accountMenu, setAccountMenu] = useState(false);
  const nickname = profile?.player.nickname || active?.label || user?.name || "";

  useEffect(() => {
    setAccountMenu(false);
  }, [pathname]);

  useEffect(() => {
    if (!accountMenu) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setAccountMenu(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [accountMenu]);

  if (!sessionReady) return <div className="min-h-dvh" />;
  if (!user) return <LoginScreen onLogin={login} savedName={savedName} problem={problem} />;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col md:border-x md:border-border/70">
      <header className="safe-top safe-x sticky top-0 z-20 flex items-center gap-2 border-b border-border/70 bg-background/85 pb-2 backdrop-blur-md">
        <Link href="/" className="shrink-0">
          <p className="font-display text-lg font-semibold tracking-tight text-primary">원신 가이드</p>
        </Link>
        <div className="relative min-w-0 flex-1">
            <button
              type="button"
              className="relative z-30 ml-auto flex min-h-11 min-w-0 max-w-full items-center gap-1 py-1 text-right"
              aria-expanded={accountMenu}
              aria-haspopup="listbox"
              onClick={() => setAccountMenu((open) => !open)}
            >
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-sm font-medium">{nickname}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {active ? `UID ${active.uid}` : user.name}
                </span>
              </span>
              <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground", accountMenu && "rotate-180")} />
            </button>
            {accountMenu && (
              <>
                <button type="button" className="fixed inset-0 z-20 cursor-default" aria-label="계정 메뉴 닫기" onClick={() => setAccountMenu(false)} />
                <ul
                  role="listbox"
                  aria-label="계정"
                  className="absolute right-0 top-full z-30 mt-2 w-60 max-w-[min(15rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-card py-1 shadow-lg"
                >
                  {accounts.map((account) => {
                    const selected = account.id === active?.id;
                    const name = selected ? nickname : account.label;
                    return (
                      <li key={account.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={selected}
                          className={cn(
                            "flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left",
                            selected && "bg-primary/10"
                          )}
                          onClick={() => {
                            activate(account.id);
                            setAccountMenu(false);
                          }}
                        >
                          <span className="min-w-0 flex-1 leading-tight">
                            <span className="block truncate text-sm font-medium">{name}</span>
                            <span className="block truncate text-xs text-muted-foreground">UID {account.uid}</span>
                          </span>
                          {selected && <Check className="h-4 w-4 shrink-0 text-primary" />}
                        </button>
                      </li>
                    );
                  })}
                  <li className="border-t border-border">
                    <Link
                      href="/accounts"
                      className="flex min-h-11 items-center px-3 text-sm text-primary"
                      onClick={() => setAccountMenu(false)}
                    >
                      계정 관리
                    </Link>
                  </li>
                </ul>
              </>
            )}
          </div>
        <button
          type="button"
          className="h-11 shrink-0 rounded-full px-3 text-sm text-muted-foreground"
          onClick={logout}
        >
          나가기
        </button>
        <button
          type="button"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-foreground"
          aria-label="테마 전환"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          <Sun className="h-5 w-5 dark:hidden" />
          <Moon className="hidden h-5 w-5 dark:block" />
        </button>
      </header>
      <main className="safe-bottom safe-x min-w-0 flex-1 py-4">{children}</main>
      <nav className="fixed bottom-0 left-1/2 z-20 w-full max-w-lg -translate-x-1/2 border-t border-border/80 bg-background/95 backdrop-blur-md">
        <div className="safe-x grid grid-cols-4 pb-[var(--safe-bottom)]">
          {NAV.map((item) => {
            const activeNav =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-h-[3.75rem] select-none flex-col items-center justify-center gap-0.5 text-[11px]",
                  activeNav ? "text-primary" : "text-muted-foreground"
                )}
              >
                <span
                  className={cn(
                    "grid h-8 w-14 place-items-center rounded-full",
                    activeNav && "bg-primary/15"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
