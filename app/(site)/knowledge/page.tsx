import type { Metadata } from "next";
import { KnowledgeCard } from "@/components/knowledge/KnowledgeCard";
import { KnowledgeSidebar } from "@/components/knowledge/KnowledgeSidebar";
import { getKnowledge, getKnowledgeTree } from "@/lib/content/knowledge";

export const metadata: Metadata = {
  title: "Knowledge",
  description: "A personal MDX writing space for career direction, plans, and implementation notes.",
  openGraph: {
    title: "Knowledge | Portfolio OS",
    description: "A personal MDX writing space for career direction, plans, and implementation notes.",
    url: "/knowledge"
  }
};

export default function KnowledgePage() {
  const allEntries = getKnowledge();
  const tree = getKnowledgeTree(allEntries);

  return (
    <div className="space-y-7">
      <section className="surface-elevated accent-frame space-y-4 p-5 sm:p-6">
        <p className="section-kicker">Writing Wiki</p>
        <h2 className="section-title text-4xl sm:text-5xl">Career direction and future builds</h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          This is your MDX-first writing system: part wiki navigation, part blog feed. Use it to track where
          your career is heading and what you want to build next.
        </p>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="space-y-4">
          {allEntries.length === 0 ? (
            <section className="surface-elevated p-5">
              <p className="text-sm text-muted-foreground">
                No entries yet. Create one in `content/knowledge` or use `npm run new:knowledge`.
              </p>
            </section>
          ) : (
            allEntries.map((entry) => <KnowledgeCard key={entry._id} entry={entry} />)
          )}
        </section>

        <KnowledgeSidebar tree={tree} />
      </div>
    </div>
  );
}
