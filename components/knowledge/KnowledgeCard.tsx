import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { KnowledgeDoc } from "@/lib/content/knowledge";
import { formatDate } from "@/lib/utils";

type KnowledgeCardProps = {
  entry: KnowledgeDoc;
};

export function KnowledgeCard({ entry }: KnowledgeCardProps) {
  return (
    <article className="surface-card card-hover p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-[0.16em] text-primary">
          {entry.category} / {entry.subcategory}
        </p>
        <p className="text-xs text-muted-foreground">Updated {formatDate(entry.updatedAt)}</p>
      </div>

      <h3 className="text-2xl font-semibold leading-tight">
        <Link href={entry.url} className="transition hover:text-primary">
          {entry.title}
        </Link>
      </h3>

      <p className="mt-3 text-sm text-muted-foreground/95">{entry.summary}</p>

      {entry.tags.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {entry.tags.slice(0, 6).map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-border/70 bg-background/50 px-2.5 py-1 text-xs text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      <Link
        href={entry.url}
        className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary transition hover:text-accent"
      >
        Open entry
        <ArrowUpRight className="h-4 w-4" />
      </Link>
    </article>
  );
}
