"use client";

import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, Bell, CornerDownLeft } from "lucide-react";
import type { SearchEntry, SearchEntryKind } from "@/lib/search/types";

type TopBarProps = {
  leftSlot?: ReactNode;
  searchIndex: SearchEntry[];
};

type ScoredEntry = {
  entry: SearchEntry;
  score: number;
};

type GroupedResultItem = ScoredEntry & {
  index: number;
};

type GroupedResult = {
  kind: SearchEntryKind;
  label: string;
  items: GroupedResultItem[];
};

const kindLabel: Record<SearchEntryKind, string> = {
  page: "Page",
  project: "Project",
  knowledge: "Knowledge",
  "quick-link": "Link"
};

const groupOrder: SearchEntryKind[] = ["project", "knowledge", "quick-link", "page"];

const groupLabel: Record<SearchEntryKind, string> = {
  page: "Pages",
  project: "Projects",
  knowledge: "Knowledge",
  "quick-link": "Quick Links"
};

const maxByKind: Record<SearchEntryKind, number> = {
  page: 3,
  project: 4,
  knowledge: 4,
  "quick-link": 4
};

const MIN_QUERY_CHARS = 2;

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function tokenize(value: string) {
  return normalize(value)
    .split(/[^a-z0-9]+/g)
    .filter(Boolean);
}

function uniqueTokens(values: string[]) {
  return Array.from(new Set(values));
}

function levenshteinDistanceWithCutoff(a: string, b: string, cutoff: number) {
  if (a === b) return 0;
  const aLen = a.length;
  const bLen = b.length;
  if (Math.abs(aLen - bLen) > cutoff) return cutoff + 1;

  const prev = new Array<number>(bLen + 1);
  const curr = new Array<number>(bLen + 1);
  for (let j = 0; j <= bLen; j += 1) {
    prev[j] = j;
  }

  for (let i = 1; i <= aLen; i += 1) {
    curr[0] = i;
    let rowMin = curr[0];

    for (let j = 1; j <= bLen; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost
      );
      if (curr[j] < rowMin) rowMin = curr[j];
    }

    if (rowMin > cutoff) {
      return cutoff + 1;
    }

    for (let j = 0; j <= bLen; j += 1) {
      prev[j] = curr[j];
    }
  }

  return prev[bLen];
}

function fuzzyTokenScore(term: string, queryToken: string) {
  if (!term || !queryToken) return 0;

  if (term === queryToken) return 48;
  if (term.startsWith(queryToken)) return 34;

  if (queryToken.length < 3 || term.length < 3) {
    return 0;
  }

  if (term.includes(queryToken)) return 19;
  if (queryToken.length >= 5 && queryToken.startsWith(term)) return 6;

  if (queryToken.length < 5) return 0;

  const cutoff = 1;
  const distance = levenshteinDistanceWithCutoff(term, queryToken, cutoff);
  if (distance <= cutoff) {
    return 11;
  }

  return 0;
}

function scoreEntry(entry: SearchEntry, query: string): number {
  const q = normalize(query);
  if (!q) return 0;
  if (q.length < MIN_QUERY_CHARS) return 0;

  const queryTokens = tokenize(q).slice(0, 5);
  if (queryTokens.length === 0) return 0;

  const title = normalize(entry.title);
  const description = normalize(entry.description || "");
  const titleTokens = uniqueTokens(tokenize(entry.title));
  const keywordTokens = uniqueTokens(entry.keywords.flatMap(tokenize));
  const descriptionTokens = uniqueTokens(tokenize(entry.description || "").slice(0, 36));
  const combinedText = `${title} ${description} ${keywordTokens.join(" ")}`;

  let score = 0;
  let matchedTokens = 0;

  if (title === q) score += 150;
  if (title.startsWith(q)) score += 104;
  if (title.includes(q)) score += 52;
  if (description.includes(q)) score += 16;
  if (combinedText.includes(q)) score += 12;

  for (const queryToken of queryTokens) {
    let bestTitle = 0;
    let bestKeyword = 0;
    let bestDescription = 0;

    for (const token of titleTokens) {
      bestTitle = Math.max(bestTitle, fuzzyTokenScore(token, queryToken));
    }
    for (const token of keywordTokens) {
      bestKeyword = Math.max(bestKeyword, fuzzyTokenScore(token, queryToken));
    }
    for (const token of descriptionTokens) {
      bestDescription = Math.max(bestDescription, fuzzyTokenScore(token, queryToken));
    }

    const best = Math.max(
      bestTitle > 0 ? bestTitle + 14 : 0,
      bestKeyword > 0 ? bestKeyword + 8 : 0,
      bestDescription > 0 ? bestDescription + 3 : 0
    );

    // Strict mode: every token must match meaningfully.
    if (best <= 0) return 0;

    matchedTokens += 1;
    score += best;
  }

  if (queryTokens.length > 0) {
    const coverage = matchedTokens / queryTokens.length;
    score += coverage * 24;
  }

  const minScore = queryTokens.length === 1 ? 44 : queryTokens.length * 28;
  if (score < minScore) {
    return 0;
  }

  return score;
}

function buildGroupedResults(searchIndex: SearchEntry[], query: string): GroupedResult[] {
  const scored = searchIndex
    .map((entry) => ({ entry, score: scoreEntry(entry, query) }))
    .filter((item) => item.score > 0);

  if (scored.length === 0) return [];

  const groups: GroupedResult[] = [];
  let cursor = 0;

  for (const kind of groupOrder) {
    const items = scored
      .filter((item) => item.entry.kind === kind)
      .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title))
      .slice(0, maxByKind[kind])
      .map((item) => {
        const indexed: GroupedResultItem = {
          ...item,
          index: cursor
        };
        cursor += 1;
        return indexed;
      });

    if (items.length > 0) {
      groups.push({
        kind,
        label: groupLabel[kind],
        items
      });
    }
  }

  return groups;
}

export function TopBar({ leftSlot, searchIndex }: TopBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const trimmedQuery = query.trim();
  const queryTooShort = trimmedQuery.length > 0 && trimmedQuery.length < MIN_QUERY_CHARS;

  const groupedResults = useMemo(
    () => (trimmedQuery.length >= MIN_QUERY_CHARS ? buildGroupedResults(searchIndex, trimmedQuery) : []),
    [searchIndex, trimmedQuery]
  );

  const flatResults = useMemo(
    () => groupedResults.flatMap((group) => group.items),
    [groupedResults]
  );

  useEffect(() => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    setActiveIndex(0);
  }, [trimmedQuery, open]);

  useEffect(() => {
    if (flatResults.length === 0) {
      if (activeIndex !== 0) {
        setActiveIndex(0);
      }
      return;
    }

    if (activeIndex > flatResults.length - 1) {
      setActiveIndex(flatResults.length - 1);
    }
  }, [flatResults.length, activeIndex]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target || !wrapperRef.current) return;
      if (!wrapperRef.current.contains(target)) {
        setOpen(false);
      }
    };

    const onKeydown = (event: KeyboardEvent) => {
      const active = document.activeElement;
      const isInInput =
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        (active instanceof HTMLElement && active.isContentEditable);

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
        return;
      }

      if (!isInInput && event.key === "/") {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
        return;
      }

      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKeydown);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKeydown);
    };
  }, []);

  const openEntry = (entry: SearchEntry) => {
    if (entry.external) {
      window.open(entry.href, "_blank", "noopener,noreferrer");
    } else {
      router.push(entry.href);
    }
    setOpen(false);
  };

  const onInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!open || flatResults.length === 0) {
      if (event.key === "Enter" && trimmedQuery) {
        event.preventDefault();
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1) % flatResults.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => (prev - 1 + flatResults.length) % flatResults.length);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      openEntry(flatResults[activeIndex].entry);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  };

  return (
    <header className="surface-elevated mb-7 flex items-center gap-3 p-3 sm:p-4">
      {leftSlot ? <div className="flex items-center gap-2">{leftSlot}</div> : null}

      <div ref={wrapperRef} className="relative min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2 rounded-2xl border border-border/80 bg-background/60 px-3 py-2 text-sm text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <Search className="h-4 w-4 shrink-0 text-primary/85" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onInputKeyDown}
            placeholder="Search knowledge, projects, links..."
            className="w-full bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
            aria-label="Search site content"
          />
          <span className="hidden rounded-lg border border-border/80 px-1.5 py-0.5 text-[10px] text-muted-foreground md:inline">
            Ctrl/Cmd + K
          </span>
        </div>

        {open && trimmedQuery ? (
          <div className="surface-elevated absolute left-0 right-0 top-[calc(100%+0.55rem)] z-50 rounded-2xl border border-border/75 bg-card/95 p-2 shadow-2xl backdrop-blur-xl">
            {queryTooShort ? (
              <div className="px-2 py-3 text-sm text-muted-foreground">Type at least {MIN_QUERY_CHARS} characters</div>
            ) : flatResults.length === 0 ? (
              <div className="px-2 py-3 text-sm text-muted-foreground">No results for &quot;{trimmedQuery}&quot;</div>
            ) : (
              <div className="max-h-[22rem] space-y-2 overflow-auto p-1">
                {groupedResults.map((group) => (
                  <section key={group.kind} className="space-y-1">
                    <p className="px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/90">
                      {group.label}
                    </p>
                    <ul className="space-y-1">
                      {group.items.map((item) => {
                        const { entry, index } = item;
                        return (
                          <li key={entry.id}>
                            <button
                              type="button"
                              onClick={() => openEntry(entry)}
                              className={`flex w-full items-start justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                                index === activeIndex
                                  ? "bg-primary/18 text-foreground"
                                  : "text-foreground/92 hover:bg-primary/10"
                              }`}
                            >
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-medium">{entry.title}</span>
                                {entry.description ? (
                                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                                    {entry.description}
                                  </span>
                                ) : null}
                              </span>
                              <span className="flex shrink-0 items-center gap-2">
                                <span className="rounded-full border border-border/70 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                                  {kindLabel[entry.kind]}
                                </span>
                                {index === activeIndex ? <CornerDownLeft className="h-3.5 w-3.5 text-primary/85" /> : null}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>

      <button
        type="button"
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border/80 bg-background/60 text-foreground/85 transition hover:border-primary/60 hover:bg-primary/14 hover:text-foreground"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
      </button>
    </header>
  );
}
