import Link from "next/link";
import { ExternalLink, Github } from "lucide-react";
import type { ProjectDoc } from "@/lib/contentlayer";
import { cn, formatDate, withBasePath } from "@/lib/utils";

const statusStyles: Record<ProjectDoc["status"], string> = {
  active: "border-cyan-300/45 bg-cyan-300/12 text-cyan-200",
  paused: "border-orange-300/45 bg-orange-300/12 text-orange-200",
  done: "border-emerald-300/45 bg-emerald-300/12 text-emerald-200"
};

type ProjectCardProps = {
  project: ProjectDoc;
};

export function ProjectCard({ project }: ProjectCardProps) {
  const links = (project.links || {}) as { repo?: string; live?: string; docs?: string };
  const coverSrc = project.cover ? withBasePath(project.cover) : null;
  const coverAlt = project.coverAlt || `${project.title} cover image`;

  return (
    <article className="surface-card card-hover group overflow-hidden p-0">
      {coverSrc ? (
        <div className="relative">
          <div className="aspect-[16/9] w-full">
            <img
              src={coverSrc}
              alt={coverAlt}
              className="h-full w-full object-cover transition-transform duration-400 group-hover:scale-[1.04]"
              loading="lazy"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#030814]/80 via-[#06122a]/25 to-transparent" />
        </div>
      ) : null}

      <div className="p-5">
        <div className="mb-3 flex items-start justify-between gap-2">
          <Link href={project.url} className="text-lg font-semibold leading-tight text-foreground transition-colors hover:text-primary">
            {project.title}
          </Link>
          <span className={cn("rounded-full border px-2 py-1 text-xs capitalize", statusStyles[project.status])}>
            {project.status}
          </span>
        </div>

        <p className="mb-5 text-sm text-muted-foreground/95">{project.summary}</p>

        <div className="mb-5 flex flex-wrap gap-2">
          {project.tags.map((tag) => (
            <span key={tag} className="rounded-full border border-border/70 bg-background/50 px-2.5 py-1 text-xs text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Updated {formatDate(project.updatedAt)}</p>
          <div className="flex items-center gap-2">
            {links.repo ? (
              <Link
                href={links.repo}
                target="_blank"
                className="rounded-lg border border-border/70 p-1 text-muted-foreground transition hover:border-primary/50 hover:bg-primary/12 hover:text-foreground"
                aria-label="Repository"
              >
                <Github className="h-4 w-4" />
              </Link>
            ) : null}
            {links.live ? (
              <Link
                href={links.live}
                target="_blank"
                className="rounded-lg border border-border/70 p-1 text-muted-foreground transition hover:border-primary/50 hover:bg-primary/12 hover:text-foreground"
                aria-label="Live link"
              >
                <ExternalLink className="h-4 w-4" />
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
