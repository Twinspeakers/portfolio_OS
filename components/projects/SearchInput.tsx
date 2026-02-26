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
      className="w-full rounded-2xl border border-border/75 bg-background/55 px-3.5 py-2.5 text-sm outline-none transition focus:border-primary/55 focus:ring-2 focus:ring-primary/30"
    />
  );
}
