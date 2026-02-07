"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { TopBar } from "@/components/layout/TopBar";
import { IconDock } from "@/components/layout/IconDock";
import { cn } from "@/lib/utils";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
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
        // Consistent outer frame in both nav modes so collapsing the sidebar
        // doesn't feel like switching to a totally different layout.
        //
        // - Outer frame: wide enough to hold the sidebar + a comfortable content width.
        // - Inner content frame: consistent max width for the main column in BOTH modes.
        "mx-auto min-h-screen w-full max-w-[96rem] px-4 py-4",
        navMode === "side"
          ? "grid grid-cols-1 gap-4 md:grid-cols-[250px_1fr]"
          : "flex flex-col gap-4"
      )}
    >
      {navMode === "side" ? <SidebarNav onCollapse={toggleNavMode} /> : null}

      <main className="min-w-0 pb-8">
        <div className="mx-auto w-full max-w-7xl">
          <TopBar
            leftSlot={
              navMode === "top" ? <IconDock mode={navMode} onToggleMode={toggleNavMode} /> : undefined
            }
          />
          {children}
        </div>
      </main>
    </div>
  );
}