"use client";

import type { ProjectSort } from "@/lib/contentlayer";

type SortSelectProps = {
  value: ProjectSort;
  onChange: (value: ProjectSort) => void;
};

export function SortSelect({ value, onChange }: SortSelectProps) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as ProjectSort)}
      className="rounded-2xl border border-border/75 bg-background/55 px-3.5 py-2.5 text-sm outline-none transition focus:border-primary/55 focus:ring-2 focus:ring-primary/30"
      aria-label="Sort projects"
    >
      <option value="recent">Recently updated</option>
      <option value="featured">Featured first</option>
      <option value="alpha">Alphabetical</option>
    </select>
  );
}
