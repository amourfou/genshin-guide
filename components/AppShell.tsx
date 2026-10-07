"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Moon, Sun, Swords, User, Users } from "lucide-react";
import { useTheme } from "next-themes";
import { useAccounts } from "@/components/AccountProvider";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "홈", icon: Home },
  { href: "/characters", label: "캐릭터", icon: Users },
  { href: "/party", label: "파티", icon: Swords },
  { href: "/accounts", label: "계정", icon: User },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { active } = useAccounts();
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col">
      <header className="safe-top sticky top-0 z-20 flex items-center justify-between border-b border-border/70 bg-background/80 px-4 pb-3 backdrop-blur-md">
        <Link href="/" className="min-w-0">
          <p className="font-display text-lg font-semibold tracking-tight text-primary">원신 가이드</p>
          <p className="truncate text-xs text-muted-foreground">
            {active ? `${active.label} · UID ${active.uid}` : "계정을 추가하면 빌드를 봅니다"}
          </p>
        </Link>
        <button
          type="button"
          className="grid h-11 w-11 place-items-center rounded-full text-foreground"
          aria-label="테마 전환"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          <Sun className="h-5 w-5 dark:hidden" />
          <Moon className="hidden h-5 w-5 dark:block" />
        </button>
      </header>
      <main className="safe-bottom flex-1 px-4 py-4">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border/80 bg-background/90 backdrop-blur-md">
        <div className="mx-auto grid max-w-5xl grid-cols-4 pb-[var(--safe-bottom)]">
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
                  "flex min-h-14 flex-col items-center justify-center gap-1 text-xs",
                  activeNav ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
