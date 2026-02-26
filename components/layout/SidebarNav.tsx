"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FolderOpen, Link2, BookOpen, PanelLeftClose } from "lucide-react";
import { cn } from "@/lib/utils";
import { navItems } from "@/lib/site-data";

const icons = {
  Dashboard: LayoutDashboard,
  Projects: FolderOpen,
  Links: Link2,
  Wiki: BookOpen
};

type SidebarNavProps = {
  onCollapse?: () => void;
};

export function SidebarNav({ onCollapse }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <aside className="surface-elevated sticky top-0 self-start h-[calc(100vh-1.25rem)] w-full p-4">
      <div className="mb-8 flex items-start justify-between gap-3 px-2">
        <div>
          <p className="section-kicker">Personal</p>
          <h1 className="mt-2 text-xl font-semibold">Portfolio OS</h1>
          <p className="mt-1 text-xs text-muted-foreground">High-energy command center</p>
        </div>

        {onCollapse ? (
          <button
            type="button"
            onClick={onCollapse}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/80 bg-background/55 text-foreground/85 transition hover:border-primary/60 hover:bg-primary/12 hover:text-foreground"
            aria-label="Collapse to top bar"
            title="Collapse to top bar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      <nav className="space-y-2">
        {navItems.map((item) => {
          const Icon = icons[item.label as keyof typeof icons] ?? Link2;
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-sm transition",
                "border-transparent bg-white/[0.01] text-muted-foreground hover:border-primary/30 hover:bg-primary/10 hover:text-foreground",
                isActive &&
                  "border-primary/65 bg-linear-to-r from-cyan-300 to-primary text-slate-950 shadow-[0_14px_24px_-18px_rgba(34,211,238,0.95)] hover:border-primary/65 hover:from-cyan-300 hover:to-primary"
              )}
            >
              <Icon className={cn("h-4 w-4", isActive ? "text-slate-950" : "text-primary/80")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
