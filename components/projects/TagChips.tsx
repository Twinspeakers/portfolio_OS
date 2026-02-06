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
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:bg-accent"
            )}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}