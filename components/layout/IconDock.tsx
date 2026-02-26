"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderOpen,
  Link2,
  BookOpen,
  PanelLeftClose,
  PanelLeftOpen
} from "lucide-react";
import { cn } from "@/lib/utils";
import { navItems } from "@/lib/site-data";

const icons = {
  Dashboard: LayoutDashboard,
  Projects: FolderOpen,
  Links: Link2,
  Wiki: BookOpen
};

type IconDockProps = {
  mode: "side" | "top";
  onToggleMode: () => void;
};

export function IconDock({ mode, onToggleMode }: IconDockProps) {
  const pathname = usePathname();

  const ToggleIcon = mode === "top" ? PanelLeftOpen : PanelLeftClose;
  const toggleLabel = mode === "top" ? "Expand sidebar" : "Collapse to top bar";

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={onToggleMode}
        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border/80 bg-background/60 text-foreground/85 transition hover:border-primary/60 hover:bg-primary/14 hover:text-foreground"
        aria-label={toggleLabel}
        title={toggleLabel}
      >
        <ToggleIcon className="h-4 w-4" />
      </button>

      <nav className="inline-flex items-center gap-2">
        {navItems.map((item) => {
          const Icon = icons[item.label as keyof typeof icons] ?? Link2;
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition",
                "border-border/80 bg-background/60 text-muted-foreground hover:border-primary/40 hover:bg-primary/14 hover:text-foreground",
                isActive &&
                  "border-primary/65 bg-linear-to-r from-cyan-300 to-primary text-slate-950 shadow-[0_12px_22px_-16px_rgba(34,211,238,0.95)] hover:border-primary/65 hover:from-cyan-300 hover:to-primary"
              )}
              aria-label={item.label}
              title={item.label}
            >
              <Icon className="h-4 w-4" />
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
