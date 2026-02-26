"use client";

import { cn } from "@/lib/utils";

type TagChipsProps = {
  tags: string[];
  selected: string[];
  toggle: (tag: string) => void;
};

export function TagChips({ tags, selected, toggle }: TagChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => {
        const isActive = selected.includes(tag);

        return (
          <button
            key={tag}
            type="button"
            onClick={() => toggle(tag)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition",
              isActive
                ? "border-primary/65 bg-linear-to-r from-cyan-300 to-primary text-slate-950 shadow-[0_10px_20px_-16px_rgba(34,211,238,0.95)]"
                : "border-border/75 bg-background/55 text-muted-foreground hover:border-primary/35 hover:bg-primary/12 hover:text-foreground"
            )}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}
