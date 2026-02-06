"use client";

type SearchInputProps = {
  value: string;
  onChange: (value: string) => void;
};

export function SearchInput({ value, onChange }: SearchInputProps) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Search projects"
      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-primary/30 transition focus:ring"
    />
  );
}