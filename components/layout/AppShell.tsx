"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { TopBar } from "@/components/layout/TopBar";
import { IconDock } from "@/components/layout/IconDock";
import { cn } from "@/lib/utils";
import type { SearchEntry } from "@/lib/search/types";

type AppShellProps = {
  children: ReactNode;
  searchIndex: SearchEntry[];
};

export function AppShell({ children, searchIndex }: AppShellProps) {
  const [navMode, setNavMode] = useState<"side" | "top">("side");

  useEffect(() => {
    // Prefer the saved mode when available.
    const saved = typeof window !== "undefined" ? localStorage.getItem("navMode") : null;
    if (saved === "side" || saved === "top") {
      setNavMode(saved);
      return;
    }

    // Sensible default: small screens behave like a top bar to preserve space.
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches) {
      setNavMode("top");
    }
  }, []);

  const toggleNavMode = () => {
    setNavMode((prev) => {
      const next = prev === "side" ? "top" : "side";
      try {
        localStorage.setItem("navMode", next);
      } catch {
        // Ignore storage failures (e.g. private browsing).
      }
      return next;
    });
  };

  return (
    <div
      className={cn(
        "relative mx-auto min-h-screen w-full max-w-[1860px] px-4 pb-8 pt-5 sm:px-6 lg:px-8",
        navMode === "side"
          ? "grid grid-cols-1 gap-5 md:grid-cols-[280px_minmax(0,1fr)]"
          : "flex flex-col gap-5"
      )}
    >
      {navMode === "side" ? <SidebarNav onCollapse={toggleNavMode} /> : null}

      <main className="min-w-0 pb-8">
        <div className={cn("w-full", navMode === "top" && "mx-auto max-w-7xl")}>
          <TopBar
            leftSlot={
              navMode === "top" ? <IconDock mode={navMode} onToggleMode={toggleNavMode} /> : undefined
            }
            searchIndex={searchIndex}
          />
          {children}
        </div>
      </main>
    </div>
  );
}
