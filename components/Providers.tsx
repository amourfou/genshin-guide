"use client";

import { ThemeProvider } from "next-themes";
import { AccountProvider } from "@/components/AccountProvider";
import { ProfileProvider } from "@/components/ProfileProvider";
import { PwaRegister } from "@/components/PwaRegister";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <PwaRegister />
      <AccountProvider>
        <ProfileProvider>{children}</ProfileProvider>
      </AccountProvider>
    </ThemeProvider>
  );
}
