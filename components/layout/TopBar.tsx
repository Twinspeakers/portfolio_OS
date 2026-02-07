import type { ReactNode } from "react";
import { Search, Bell } from "lucide-react";

type TopBarProps = {
  /** Optional content rendered to the left of the search bar (e.g. icon dock). */
  leftSlot?: ReactNode;
};

export function TopBar({ leftSlot }: TopBarProps) {
  return (
    <header className="surface-elevated mb-6 flex items-center gap-3 p-3 sm:p-4">
      {leftSlot ? <div className="flex items-center gap-2">{leftSlot}</div> : null}

      <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
        <Search className="h-4 w-4 shrink-0" />
        <span className="truncate">Search docs, projects, links...</span>
      </div>

      <button
        type="button"
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background transition hover:bg-accent"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
      </button>
    </header>
  );
}
