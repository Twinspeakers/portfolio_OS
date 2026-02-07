import type { Metadata } from "next";
import Link from "next/link";
import { HeroSceneBanner } from "@/components/three/HeroSceneBanner";
import { LinkCard } from "@/components/cards/LinkCard";
import { ProjectCard } from "@/components/cards/ProjectCard";
import { StatCard } from "@/components/cards/StatCard";
import { getFeaturedProjects, getProjectStats, getRecentProjects } from "@/lib/contentlayer";
import { quickLinks } from "@/lib/site-data";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Home base for your portfolio OS with quick links, featured projects, stats, and 3D previews.",
  openGraph: {
    title: "Dashboard | Portfolio OS",
    description: "Home base for your portfolio OS with quick links, featured projects, stats, and 3D previews.",
    url: "/"
  }
};

export default function DashboardPage() {
  const featured = getFeaturedProjects().slice(0, 3);
  const recent = getRecentProjects(4);
  const stats = getProjectStats();
  const topLinks = quickLinks.slice(0, 8);
  const totalProjects = stats.active + stats.paused + stats.done;

  return (
    <div className="grid gap-6">
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
          <h3 className="text-3xl font-semibold">Featured Projects</h3>
          <Link href="/projects" className="text-sm text-cyan-300 hover:underline">Browse library</Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {featured.map((project) => (
            <ProjectCard key={project._id} project={project} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold">Recently Updated</h3>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {recent.map((project) => (
            <ProjectCard key={`recent-${project._id}`} project={project} />
          ))}
        </div>
      </section>

      <section className="surface-elevated p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Quick Links</h3>
          <Link href="/links" className="text-sm text-cyan-300 hover:underline">View all</Link>
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
