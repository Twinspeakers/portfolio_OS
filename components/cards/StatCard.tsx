type StatCardProps = {
  label: string;
  value: number;
};

export function StatCard({ label, value }: StatCardProps) {
  return (
    <article className="surface-ghost card-hover relative overflow-hidden p-5">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/80 to-transparent" />
      <p className="text-xs uppercase tracking-[0.24em] text-primary/85">{label}</p>
      <p className="mt-2 text-4xl font-semibold tracking-tight">{value}</p>
    </article>
  );
}
