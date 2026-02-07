import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXContent } from "@/components/mdx/MDXContent";
import { getProjectBySlug, getProjects } from "@/lib/contentlayer";
import { formatDate } from "@/lib/utils";

export function generateStaticParams() {
  return getProjects().map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = getProjectBySlug(slug);

  if (!project) {
    return { title: "Project not found" };
  }

  return {
    title: `${project.title} | Projects`,
    description: project.summary,
    openGraph: {
      title: `${project.title} | Portfolio OS`,
      description: project.summary,
      url: `/projects/${project.slug}`
    }
  };
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  const links = (project.links || {}) as { repo?: string; live?: string; docs?: string };

  return (
    <article className="space-y-6">
      <Link href="/projects" className="inline-flex text-sm text-cyan-300 hover:underline">
        Back to Projects
      </Link>

      <header className="space-y-3 rounded-2xl border border-border/70 bg-card/80 p-5 shadow-panel">
        <h1 className="text-3xl font-semibold">{project.title}</h1>
        <p className="text-muted-foreground">{project.summary}</p>
      </header>

      <section className="grid gap-4 rounded-2xl border border-border/70 bg-card/80 p-5 shadow-panel md:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
          <p className="mt-1 capitalize">{project.status}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Stack</p>
          <p className="mt-1">{project.stack.join(", ")}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Dates</p>
          <p className="mt-1">Updated {formatDate(project.updatedAt)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Links</p>
          <div className="mt-1 flex flex-wrap gap-3 text-sm">
            {links.repo ? <Link href={links.repo} target="_blank" className="text-cyan-300 hover:underline">GitHub</Link> : null}
            {links.live ? <Link href={links.live} target="_blank" className="text-cyan-300 hover:underline">Live</Link> : null}
            {links.docs ? <Link href={links.docs} target="_blank" className="text-cyan-300 hover:underline">Docs</Link> : null}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border/70 bg-card/80 p-5 shadow-panel">
        <MDXContent source={project.body.raw} />
      </section>
    </article>
  );
}
