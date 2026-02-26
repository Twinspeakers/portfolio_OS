import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowUpRight } from "lucide-react";
import type { QuickLink } from "@/lib/site-data";
import { withBasePath } from "@/lib/utils";

type LinkCardProps = {
  item: QuickLink;
};

function getFaviconUrl(href: string) {
  return `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(href)}&sz=128`;
}

export function LinkCard({ item }: LinkCardProps) {
  const iconSrc = withBasePath(item.iconSrc ?? getFaviconUrl(item.href));
  const cardStyle: CSSProperties = {
    backgroundImage: [
      "linear-gradient(195deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.04) 35%, rgba(255, 255, 255, 0) 60%)",
      `linear-gradient(167deg, ${item.theme.gradientFrom} 0%, ${item.theme.gradientTo} 100%)`
    ].join(", ")
  };

  return (
    <article className="card-hover overflow-hidden rounded-3xl p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_22px_38px_-24px_rgba(2,6,23,0.9)]" style={cardStyle}>
      <div className="grid grid-cols-[4.25rem_1fr] items-stretch gap-4">
        <img
          src={iconSrc}
          alt={`${item.name} icon`}
          className="h-full w-full self-stretch object-contain"
          loading="lazy"
          referrerPolicy="no-referrer"
        />

        <div className="min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-foreground">{item.name}</h3>
              {item.note ? <p className="mt-1 text-sm text-foreground/80">{item.note}</p> : null}
            </div>

            <Link
              href={item.href}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg p-1.5 text-foreground/75 transition hover:bg-primary/18 hover:text-foreground"
              aria-label={`Open ${item.name}`}
            >
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-foreground/65">{item.category}</p>
        </div>
      </div>
    </article>
  );
}
