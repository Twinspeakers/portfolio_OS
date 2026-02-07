import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export type ProjectStatus = "active" | "paused" | "done";

type ProjectLinks = {
  repo?: string;
  live?: string;
  docs?: string;
};

export type ProjectDoc = {
  _id: string;
  url: string;
  title: string;
  slug: string;
  summary: string;
  status: ProjectStatus;
  tags: string[];
  stack: string[];
  featured: boolean;
  createdAt?: string;
  updatedAt: string;
  links?: ProjectLinks;
  body: {
    raw: string;
  };
};

export type ProjectSort = "recent" | "featured" | "alpha";

const projectsDir = path.join(process.cwd(), "content", "projects");

function normalizeProject(data: Record<string, unknown>, body: string, fileName: string): ProjectDoc {
  const slug = String(data.slug || fileName.replace(/\.mdx?$/, ""));
  const status = String(data.status || "active") as ProjectStatus;

  return {
    _id: slug,
    url: `/projects/${slug}`,
    title: String(data.title || slug),
    slug,
    summary: String(data.summary || ""),
    status: status === "active" || status === "paused" || status === "done" ? status : "active",
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    stack: Array.isArray(data.stack) ? data.stack.map(String) : [],
    featured: Boolean(data.featured),
    createdAt: data.createdAt ? String(data.createdAt) : undefined,
    updatedAt: String(data.updatedAt || new Date().toISOString()),
    links: (data.links as ProjectLinks | undefined) || undefined,
    body: {
      raw: body
    }
  };
}

function readProjectsFromDisk(): ProjectDoc[] {
  if (!fs.existsSync(projectsDir)) {
    return [];
  }

  const files = fs
    .readdirSync(projectsDir)
    .filter((file) => file.endsWith(".mdx") || file.endsWith(".md"));

  return files.map((file) => {
    const fullPath = path.join(projectsDir, file);
    const source = fs.readFileSync(fullPath, "utf8");
    const parsed = matter(source);
    return normalizeProject(parsed.data as Record<string, unknown>, parsed.content, file);
  });
}

export function getProjects() {
  return readProjectsFromDisk().sort(
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
  return getProjects().find((project) => project.slug === slug);
}

export function getProjectStats() {
  const projects = getProjects();

  return {
    active: projects.filter((project) => project.status === "active").length,
    paused: projects.filter((project) => project.status === "paused").length,
    done: projects.filter((project) => project.status === "done").length
  };
}
