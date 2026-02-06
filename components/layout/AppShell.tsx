import type { ReactNode } from "react";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { TopBar } from "@/components/layout/TopBar";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 gap-4 px-4 py-4 md:grid-cols-[250px_1fr]">
      <SidebarNav />
      <main className="min-w-0 pb-8">
        <TopBar />
        {children}
      </main>
    </div>
  );
}