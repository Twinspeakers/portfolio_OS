import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { QuickLink } from "@/lib/site-data";

type LinkCardProps = {
  item: QuickLink;
};

export function LinkCard({ item }: LinkCardProps) {
  return (
    <article className="surface-ghost card-hover p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium">{item.name}</h3>
          {item.note ? <p className="mt-1 text-sm text-muted-foreground">{item.note}</p> : null}
        </div>
        <Link href={item.href} target="_blank" className="rounded-md p-1 text-muted-foreground transition hover:bg-accent hover:text-foreground" aria-label={`Open ${item.name}`}>
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
      <p className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">{item.category}</p>
    </article>
  );
}
