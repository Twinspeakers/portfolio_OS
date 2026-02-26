import Link from "next/link";
import type { KnowledgeTreeCategory } from "@/lib/content/knowledge";
import { cn } from "@/lib/utils";

type KnowledgeSidebarProps = {
  tree: KnowledgeTreeCategory[];
  activeSlug?: string;
  activeCategory?: string;
  activeSubcategory?: string;
};

export function KnowledgeSidebar({
  tree,
  activeSlug,
  activeCategory,
  activeSubcategory
}: KnowledgeSidebarProps) {
  return (
    <aside className="surface-elevated h-fit space-y-4 p-4 xl:sticky xl:top-5">
      <div className="space-y-1">
        <p className="section-kicker">Wiki Tree</p>
        <h3 className="text-lg font-semibold">Categories</h3>
      </div>

      <div className="space-y-4">
        {tree.map((category) => {
          const categoryIsActive = activeCategory
            ? category.name.localeCompare(activeCategory, undefined, { sensitivity: "base" }) === 0
            : false;

          return (
            <section key={category.name} className="space-y-2">
              <p
                className={cn(
                  "inline-flex rounded-lg px-1 py-0.5 text-sm font-semibold",
                  categoryIsActive ? "text-primary" : "text-foreground"
                )}
              >
                {category.name}
              </p>

              <div className="space-y-3 pl-2">
                {category.subcategories.map((subcategory) => {
                  const subcategoryIsActive = activeSubcategory
                    ? subcategory.name.localeCompare(activeSubcategory, undefined, { sensitivity: "base" }) === 0
                    : false;

                  return (
                    <div key={`${category.name}-${subcategory.name}`} className="space-y-1.5 border-l border-border/70 pl-2.5">
                      <p
                        className={cn(
                          "block text-xs font-medium uppercase tracking-[0.15em]",
                          subcategoryIsActive ? "text-primary" : "text-muted-foreground"
                        )}
                      >
                        {subcategory.name}
                      </p>

                      <div className="space-y-1">
                        {subcategory.entries.map((entry) => {
                          const isEntryActive = activeSlug === entry.slug;
                          return (
                            <Link
                              key={entry.slug}
                              href={entry.url}
                              className={cn(
                                "block rounded-md px-2 py-1 text-sm leading-snug transition",
                                isEntryActive
                                  ? "bg-primary/15 text-primary"
                                  : "text-muted-foreground hover:bg-primary/10 hover:text-foreground"
                              )}
                            >
                              {entry.title}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </aside>
  );
}
