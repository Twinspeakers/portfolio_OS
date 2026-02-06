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
      className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-primary/30 transition focus:ring"
      aria-label="Filter by status"
    >
      <option value="all">All status</option>
      <option value="active">Active</option>
      <option value="paused">Paused</option>
      <option value="done">Done</option>
    </select>
  );
}