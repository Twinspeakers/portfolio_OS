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
      className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-primary/30 transition focus:ring"
      aria-label="Sort projects"
    >
      <option value="recent">Recently updated</option>
      <option value="featured">Featured first</option>
      <option value="alpha">Alphabetical</option>
    </select>
  );
}