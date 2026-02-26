import { getKnowledge } from "@/lib/content/knowledge";
import { getProjects } from "@/lib/contentlayer";
import { navItems, quickLinks } from "@/lib/site-data";
import type { SearchEntry } from "@/lib/search/types";

function cleanText(value: string) {
  return value
    .replace(/`{1,3}[^`]*`{1,3}/g, " ")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[[^\]]+\]\([^)]+\)/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function extractMarkdownSignals(markdown: string): string[] {
  const headings = Array.from(markdown.matchAll(/^#{1,6}\s+(.+)$/gm))
    .map((match) => cleanText(match[1] || ""))
    .filter(Boolean)
    .slice(0, 14);

  const linkText = Array.from(markdown.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g))
    .flatMap((match) => [cleanText(match[1] || ""), cleanText(match[2] || "")])
    .filter(Boolean)
    .slice(0, 18);

  const wikiLinks = Array.from(markdown.matchAll(/\[\[([^\]]+)\]\]/g))
    .map((match) => cleanText(match[1] || ""))
    .filter(Boolean)
    .slice(0, 10);

  // Keep this index signal-focused (section/link terms) to avoid noisy broad matches.
  return unique([...headings, ...linkText, ...wikiLinks]);
}

export function getSiteSearchIndex(): SearchEntry[] {
  const entries: SearchEntry[] = [];

  entries.push(
    ...navItems.map((item) => ({
      id: `page:${item.href}`,
      kind: "page" as const,
      title: item.label,
      href: item.href,
      description:
        item.href === "/"
          ? "Dashboard overview"
          : item.href === "/projects"
            ? "Project library"
            : item.href === "/links"
              ? "Saved quick links"
              : "Knowledge hub",
      keywords: [item.label, item.href.replace("/", ""), "navigation"]
    }))
  );

  entries.push(
    ...getProjects().map((project) => ({
      id: `project:${project.slug}`,
      kind: "project" as const,
      title: project.title,
      href: project.url,
      description: project.summary,
      keywords: unique([
        project.slug,
        project.status,
        ...project.tags,
        ...project.stack,
        ...extractMarkdownSignals(project.body.raw)
      ])
    }))
  );

  entries.push(
    ...getKnowledge().map((entry) => ({
      id: `knowledge:${entry.slug}`,
      kind: "knowledge" as const,
      title: entry.title,
      href: entry.url,
      description: entry.summary,
      keywords: unique([
        entry.slug,
        entry.category,
        entry.subcategory,
        ...entry.tags,
        ...extractMarkdownSignals(entry.body.raw)
      ])
    }))
  );

  entries.push(
    ...quickLinks.map((item) => ({
      id: `quick-link:${item.name.toLowerCase()}`,
      kind: "quick-link" as const,
      title: item.name,
      href: item.href,
      description: item.note || `${item.category} tool`,
      keywords: [item.category, item.name, item.note || ""],
      external: true
    }))
  );

  entries.push(
    ...quickLinks.flatMap((item) =>
      (item.deepLinks ?? []).map((deepLink, index) => ({
        id: `quick-link:${item.name.toLowerCase()}:deep:${index}`,
        kind: "quick-link" as const,
        title: deepLink.title,
        href: deepLink.href,
        description: deepLink.note || `${item.name} subpage`,
        keywords: unique([
          item.name,
          item.category,
          item.note || "",
          deepLink.title,
          deepLink.note || "",
          ...(deepLink.keywords ?? [])
        ]),
        external: true
      }))
    )
  );

  return entries;
}
