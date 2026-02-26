"use client";

type StatusValue = "all" | "active" | "paused" | "done";

type StatusSelectProps = {
  value: StatusValue;
  onChange: (value: StatusValue) => void;
};

export function StatusSelect({ value, onChange }: StatusSelectProps) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as StatusValue)}
      className="rounded-2xl border border-border/75 bg-background/55 px-3.5 py-2.5 text-sm outline-none transition focus:border-primary/55 focus:ring-2 focus:ring-primary/30"
      aria-label="Filter by status"
    >
      <option value="all">All status</option>
      <option value="active">Active</option>
      <option value="paused">Paused</option>
      <option value="done">Done</option>
    </select>
  );
}
