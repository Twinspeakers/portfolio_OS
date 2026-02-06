import { allProjects } from "contentlayer/generated";

export type ProjectDoc = (typeof allProjects)[number];

export type ProjectSort = "recent" | "featured" | "alpha";

export function getProjects() {
  return [...allProjects].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function getFeaturedProjects() {
  return getProjects().filter((project) => project.featured);
}

export function getRecentProjects(limit = 4) {
  return getProjects().slice(0, limit);
}

export function getProjectBySlug(slug: string) {
  return allProjects.find((project) => project.slug === slug);
}

export function getProjectStats() {
  const projects = getProjects();

  return {
    active: projects.filter((project) => project.status === "active").length,
    paused: projects.filter((project) => project.status === "paused").length,
    done: projects.filter((project) => project.status === "done").length
  };
}