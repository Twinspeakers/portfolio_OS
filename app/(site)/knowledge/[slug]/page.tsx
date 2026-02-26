import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { KnowledgeSidebar } from "@/components/knowledge/KnowledgeSidebar";
import { MDXContent } from "@/components/mdx/MDXContent";
import { getKnowledge, getKnowledgeBySlug, getKnowledgeTree } from "@/lib/content/knowledge";
import { formatDate } from "@/lib/utils";

export function generateStaticParams() {
  return getKnowledge().map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const entry = getKnowledgeBySlug(slug);

  if (!entry) {
    return { title: "Entry not found" };
  }

  return {
    title: `${entry.title} | Knowledge`,
    description: entry.summary,
    openGraph: {
      title: `${entry.title} | Portfolio OS`,
      description: entry.summary,
      url: `/knowledge/${entry.slug}`
    }
  };
}

export default async function KnowledgeDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const allEntries = getKnowledge();
  const entry = allEntries.find((item) => item.slug === slug);

  if (!entry) {
    notFound();
  }

  const tree = getKnowledgeTree(allEntries);

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <article className="space-y-6">
        <Link href="/knowledge" className="inline-flex text-sm font-medium text-primary transition hover:text-accent">
          Back to Writing Wiki
        </Link>

        <header className="surface-elevated accent-frame space-y-4 p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-primary">
            {entry.category} / {entry.subcategory}
          </p>
          <h1 className="text-3xl font-semibold sm:text-4xl">{entry.title}</h1>
          <p className="max-w-3xl text-muted-foreground">{entry.summary}</p>
          <p className="text-xs text-muted-foreground">
            Published {formatDate(entry.publishedAt)} | Updated {formatDate(entry.updatedAt)}
          </p>

          {entry.tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {entry.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-border/70 bg-background/55 px-2.5 py-1 text-xs text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </header>

        <section className="surface-elevated p-5">
          <MDXContent source={entry.body.raw} />
        </section>
      </article>

      <KnowledgeSidebar
        tree={tree}
        activeSlug={entry.slug}
        activeCategory={entry.category}
        activeSubcategory={entry.subcategory}
      />
    </div>
  );
}
