"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FolderOpen, Link2, Orbit } from "lucide-react";
import { cn } from "@/lib/utils";
import { navItems } from "@/lib/site-data";

const icons = {
  Dashboard: LayoutDashboard,
  Projects: FolderOpen,
  Links: Link2,
  Lab: Orbit
};

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <aside className="surface-card sticky top-4 h-[calc(100vh-2rem)] w-full p-4">
      <div className="mb-8 px-2">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Personal</p>
        <h1 className="mt-2 text-xl font-semibold">Portfolio OS</h1>
      </div>
      <nav className="space-y-2">
        {navItems.map((item) => {
          const Icon = icons[item.label as keyof typeof icons];
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground transition",
                "hover:bg-accent hover:text-accent-foreground",
                isActive && "bg-primary text-primary-foreground hover:bg-primary"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
