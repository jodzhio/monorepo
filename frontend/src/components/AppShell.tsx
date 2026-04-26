import type { ReactNode } from "react";
import { Header } from "./Header";

interface AppShellProps {
  children: ReactNode;
  hideProfile?: boolean;
  hideNav?: boolean;
}

export function AppShell({ children, hideProfile, hideNav }: AppShellProps) {
  return (
    <div className="relative min-h-[100dvh]">
      <Header hideProfile={hideProfile} hideNav={hideNav} />
      <main className="mx-auto w-full max-w-app px-4 pb-10 pt-4 md:px-8 md:pt-6">
        {children}
      </main>
    </div>
  );
}
