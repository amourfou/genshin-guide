"use client";

import { ThemeProvider } from "next-themes";
import { AccountProvider } from "@/components/AccountProvider";
import { ProfileProvider } from "@/components/ProfileProvider";
import { PwaRegister } from "@/components/PwaRegister";
import { SessionProvider } from "@/components/SessionProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <PwaRegister />
      <SessionProvider>
        <AccountProvider>
          <ProfileProvider>{children}</ProfileProvider>
        </AccountProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
