import Link from "next/link";
import { ExternalLink, Github } from "lucide-react";
import type { ProjectDoc } from "@/lib/contentlayer";
import { cn, formatDate } from "@/lib/utils";

const statusStyles: Record<ProjectDoc["status"], string> = {
  active: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
  paused: "bg-amber-500/15 text-amber-300 border-amber-400/30",
  done: "bg-sky-500/15 text-sky-300 border-sky-400/30"
};

type ProjectCardProps = {
  project: ProjectDoc;
};

export function ProjectCard({ project }: ProjectCardProps) {
  const links = (project.links || {}) as { repo?: string; live?: string; docs?: string };

  return (
    <article className="surface-ghost card-hover group p-5">
      <div className="mb-3 flex items-start justify-between gap-2">
        <Link href={project.url} className="text-lg font-semibold leading-tight hover:underline">
          {project.title}
        </Link>
        <span className={cn("rounded-full border px-2 py-1 text-xs capitalize", statusStyles[project.status])}>
          {project.status}
        </span>
      </div>

      <p className="mb-5 text-sm text-muted-foreground">{project.summary}</p>

      <div className="mb-5 flex flex-wrap gap-2">
        {project.tags.map((tag) => (
          <span key={tag} className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
            {tag}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Updated {formatDate(project.updatedAt)}</p>
        <div className="flex items-center gap-2">
          {links.repo ? (
            <Link href={links.repo} target="_blank" className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Repository">
              <Github className="h-4 w-4" />
            </Link>
          ) : null}
          {links.live ? (
            <Link href={links.live} target="_blank" className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Live link">
              <ExternalLink className="h-4 w-4" />
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}
