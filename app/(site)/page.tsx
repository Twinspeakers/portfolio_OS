import type { Metadata } from "next";
import Link from "next/link";
import { HeroSceneBanner } from "@/components/three/HeroSceneBanner";
import { LinkCard } from "@/components/cards/LinkCard";
import { ProjectCard } from "@/components/cards/ProjectCard";
import { KnowledgeCard } from "@/components/knowledge/KnowledgeCard";
import { StatCard } from "@/components/cards/StatCard";
import { getProjects } from "@/lib/contentlayer";
import { getKnowledge } from "@/lib/content/knowledge";
import { quickLinks } from "@/lib/site-data";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Home base for your portfolio OS with quick links, featured projects, and stats.",
  openGraph: {
    title: "Dashboard | Portfolio OS",
    description: "Home base for your portfolio OS with quick links, featured projects, and stats.",
    url: "/"
  }
};

export default function DashboardPage() {
  const projects = getProjects();
  const featured = projects.filter((project) => project.featured).slice(0, 3);
  const recent = projects.slice(0, 4);
  const stats = {
    active: projects.filter((project) => project.status === "active").length,
    paused: projects.filter((project) => project.status === "paused").length,
    done: projects.filter((project) => project.status === "done").length
  };
  const topLinks = quickLinks.filter((item) => item.pinned);
  const recentKnowledge = getKnowledge().slice(0, 3);
  const totalProjects = stats.active + stats.paused + stats.done;

  return (
    <div className="grid gap-7">
      <HeroSceneBanner
        title="Portfolio OS"
        description="Your projects, tools, and interactive demos in one place."
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Projects" value={totalProjects} />
        <StatCard label="Active Projects" value={stats.active} />
        <StatCard label="Paused" value={stats.paused} />
        <StatCard label="Completed" value={stats.done} />
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="section-title text-2xl sm:text-3xl">Featured Projects</h3>
          <Link href="/projects" className="text-sm font-medium text-primary transition hover:text-accent">Browse library</Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {featured.map((project) => (
            <ProjectCard key={project._id} project={project} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-2xl font-semibold tracking-tight">Recently Updated</h3>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {recent.map((project) => (
            <ProjectCard key={`recent-${project._id}`} project={project} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-semibold tracking-tight">Writing Pulse</h3>
          <Link href="/knowledge" className="text-sm font-medium text-primary transition hover:text-accent">
            Open wiki
          </Link>
        </div>

        {recentKnowledge.length === 0 ? (
          <section className="surface-elevated p-5">
            <p className="text-sm text-muted-foreground">No knowledge entries yet. Add files in `content/knowledge`.</p>
          </section>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {recentKnowledge.map((entry) => (
              <KnowledgeCard key={`knowledge-${entry._id}`} entry={entry} />
            ))}
          </div>
        )}
      </section>

      <section className="surface-elevated accent-frame p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Quick Links</h3>
          <Link href="/links" className="text-sm font-medium text-primary transition hover:text-accent">View all</Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {topLinks.map((item) => (
            <LinkCard key={item.name} item={item} />
          ))}
        </div>
      </section>
    </div>
  );
}
