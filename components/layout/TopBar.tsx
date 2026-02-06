import { Search, Bell } from "lucide-react";

export function TopBar() {
  return (
    <header className="surface-elevated mb-6 flex items-center justify-between p-4">
      <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
        <Search className="h-4 w-4" />
        Search docs, projects, links...
      </div>
      <button
        type="button"
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background transition hover:bg-accent"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
      </button>
    </header>
  );
}
