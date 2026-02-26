import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXContent } from "@/components/mdx/MDXContent";
import { GalleryCarousel } from "@/components/projects/GalleryCarousel";
import { getProjectBySlug, getProjects } from "@/lib/contentlayer";
import { formatDate, withBasePath } from "@/lib/utils";

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
  const coverSrc = project.cover ? withBasePath(project.cover) : null;
  const coverAlt = project.coverAlt || `${project.title} cover image`;

  return (
    <article className="space-y-6">
      <Link href="/projects" className="inline-flex text-sm font-medium text-primary transition hover:text-accent">
        Back to Projects
      </Link>

      {coverSrc ? (
        <section className="surface-card relative overflow-hidden p-0">
          <div className="aspect-[21/9] w-full">
            <img src={coverSrc} alt={coverAlt} className="h-full w-full object-cover" loading="lazy" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#030814]/75 via-[#030814]/12 to-transparent" />
        </section>
      ) : null}

      <header className="surface-elevated accent-frame space-y-3 p-5">
        <h1 className="text-3xl font-semibold">{project.title}</h1>
        <p className="text-muted-foreground">{project.summary}</p>
      </header>

      <section className="surface-elevated grid gap-4 p-5 md:grid-cols-2">
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
            {links.repo ? <Link href={links.repo} target="_blank" className="font-medium text-primary transition hover:text-accent">GitHub</Link> : null}
            {links.live ? <Link href={links.live} target="_blank" className="font-medium text-primary transition hover:text-accent">Live</Link> : null}
            {links.docs ? <Link href={links.docs} target="_blank" className="font-medium text-primary transition hover:text-accent">Docs</Link> : null}
          </div>
        </div>
      </section>

      {project.gallery?.length ? <GalleryCarousel items={project.gallery} /> : null}

      <section className="surface-elevated p-5">
        <MDXContent source={project.body.raw} />
      </section>
    </article>
  );
}
