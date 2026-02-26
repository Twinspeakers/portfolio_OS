"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import type { ProjectGalleryItem } from "@/lib/contentlayer";
import { cn, withBasePath } from "@/lib/utils";

type GalleryCarouselProps = {
  items: ProjectGalleryItem[];
  className?: string;
  title?: string;
};

export function GalleryCarousel({ items, className, title = "Gallery" }: GalleryCarouselProps) {
  const safeItems = useMemo(() => (Array.isArray(items) ? items.filter((item) => Boolean(item?.src)) : []), [items]);
  const [index, setIndex] = useState(0);

  const clampIndex = useCallback(
    (next: number) => {
      if (safeItems.length === 0) return 0;
      return ((next % safeItems.length) + safeItems.length) % safeItems.length;
    },
    [safeItems.length]
  );

  const go = useCallback(
    (delta: number) => {
      setIndex((current) => clampIndex(current + delta));
    },
    [clampIndex]
  );

  useEffect(() => {
    setIndex((current) => clampIndex(current));
  }, [clampIndex]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        go(-1);
      }
      if (event.key === "ArrowRight") {
        go(1);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [go]);

  if (safeItems.length === 0) {
    return null;
  }

  const active = safeItems[index];
  const activeSrc = withBasePath(active.src);

  return (
    <section className={cn("space-y-4", className)} aria-label={title}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{title}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {index + 1} / {safeItems.length}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => go(-1)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border/75 bg-background/55 backdrop-blur transition hover:border-primary/50 hover:bg-primary/12"
            aria-label="Previous image"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border/75 bg-background/55 backdrop-blur transition hover:border-primary/50 hover:bg-primary/12"
            aria-label="Next image"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <a
            href={activeSrc}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-2xl border border-border/75 bg-background/55 px-3 text-sm text-muted-foreground backdrop-blur transition hover:border-primary/50 hover:bg-primary/12 hover:text-foreground"
            aria-label="Open image in new tab"
          >
            <ExternalLink className="h-4 w-4" />
            Open
          </a>
        </div>
      </div>

      <div className="surface-card relative overflow-hidden p-0">
        <div className="aspect-video w-full">
          <img
            src={activeSrc}
            alt={active.alt ?? "Project screenshot"}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#030814]/65 via-transparent to-transparent" />

        {(active.caption || active.alt) ? (
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <p className="text-sm text-slate-200/90 drop-shadow">
              {active.caption ?? active.alt}
            </p>
          </div>
        ) : null}
      </div>

      {safeItems.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {safeItems.map((item, i) => {
            const src = withBasePath(item.src);
            const selected = i === index;

            return (
              <button
                key={`${item.src}-${i}`}
                type="button"
                onClick={() => setIndex(i)}
                className={cn(
                  "relative shrink-0 overflow-hidden rounded-xl border transition",
                  selected ? "border-primary/70" : "border-border/70 hover:border-primary/40"
                )}
                aria-label={`Select image ${i + 1}`}
              >
                <div className="h-16 w-28">
                  <img
                    src={src}
                    alt={item.alt ?? `Thumbnail ${i + 1}`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
                {selected ? <div className="absolute inset-0 ring-2 ring-primary/45" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
