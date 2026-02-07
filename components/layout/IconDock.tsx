"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderOpen,
  FileText,
  Image as ImageIcon,
  Link2,
  Orbit,
  PanelLeftClose,
  PanelLeftOpen
} from "lucide-react";
import { cn } from "@/lib/utils";
import { navItems } from "@/lib/site-data";

const icons = {
  Dashboard: LayoutDashboard,
  Projects: FolderOpen,
  Editor: FileText,
  "Image Lab": ImageIcon,
  Links: Link2,
  Lab: Orbit
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
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background transition hover:bg-accent"
        aria-label={toggleLabel}
        title={toggleLabel}
      >
        <ToggleIcon className="h-4 w-4" />
      </button>

      <nav className="inline-flex items-center gap-2">
        {navItems.map((item) => {
          const Icon = icons[item.label as keyof typeof icons];
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition",
                "hover:bg-accent hover:text-accent-foreground",
                isActive && "bg-primary text-primary-foreground hover:bg-primary"
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
