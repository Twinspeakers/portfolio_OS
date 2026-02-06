"use client";

import { useMemo, useState } from "react";
import { ProjectCard } from "@/components/cards/ProjectCard";
import { SearchInput } from "@/components/projects/SearchInput";
import { SortSelect } from "@/components/projects/SortSelect";
import { StatusSelect } from "@/components/projects/StatusSelect";
import { TagChips } from "@/components/projects/TagChips";
import type { ProjectDoc, ProjectSort } from "@/lib/contentlayer";

type ProjectsExplorerProps = {
  projects: ProjectDoc[];
};

type Status = "all" | "active" | "paused" | "done";

export function ProjectsExplorer({ projects }: ProjectsExplorerProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const [sort, setSort] = useState<ProjectSort>("recent");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const allTags = useMemo(() => Array.from(new Set(projects.flatMap((project) => project.tags))).sort(), [projects]);

  const filtered = useMemo(() => {
    let next = [...projects];

    if (search.trim()) {
      const query = search.toLowerCase();
      next = next.filter((project) =>
        `${project.title} ${project.summary}`.toLowerCase().includes(query)
      );
    }

    if (status !== "all") {
      next = next.filter((project) => project.status === status);
    }

    if (selectedTags.length > 0) {
      next = next.filter((project) => selectedTags.every((tag) => project.tags.includes(tag)));
    }

    if (sort === "recent") {
      next.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }

    if (sort === "featured") {
      next.sort((a, b) => Number(b.featured) - Number(a.featured));
    }

    if (sort === "alpha") {
      next.sort((a, b) => a.title.localeCompare(b.title));
    }

    return next;
  }, [projects, search, selectedTags, sort, status]);

  const toggleTag = (tag: string) => {
    setSelectedTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]
    );
  };

  return (
    <section className="space-y-6">
      <div className="surface-elevated grid gap-3 p-5 md:grid-cols-[1fr_auto_auto]">
        <SearchInput value={search} onChange={setSearch} />
        <StatusSelect value={status} onChange={setStatus} />
        <SortSelect value={sort} onChange={setSort} />
        <div className="md:col-span-3">
          <TagChips tags={allTags} selected={selectedTags} toggle={toggleTag} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((project) => (
          <ProjectCard key={project._id} project={project} />
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="surface-elevated p-6 text-sm text-muted-foreground">
          No projects matched your filters.
        </p>
      ) : null}
    </section>
  );
}
