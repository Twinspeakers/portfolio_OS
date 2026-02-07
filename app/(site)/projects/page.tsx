import type { Metadata } from "next";
import { ProjectsExplorer } from "@/components/projects/ProjectsExplorer";
import { getProjects } from "@/lib/contentlayer";

export const metadata: Metadata = {
  title: "Projects",
  description: "Filterable library of portfolio projects with tags, status, and recency sorting.",
  openGraph: {
    title: "Projects | Portfolio OS",
    description: "Filterable library of portfolio projects with tags, status, and recency sorting.",
    url: "/projects"
  }
};

export default function ProjectsPage() {
  const projects = getProjects();

  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Projects</p>
        <h2 className="mt-4 text-6xl font-semibold">Project Library</h2>
        <p className="mt-4 text-sm text-muted-foreground">
          Filter by status and tags, search by title or summary, and sort your catalog quickly.
        </p>
      </section>
      <ProjectsExplorer projects={projects} />
    </div>
  );
}
