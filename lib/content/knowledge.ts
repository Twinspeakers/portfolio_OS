import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export type KnowledgeDoc = {
  _id: string;
  url: string;
  title: string;
  slug: string;
  summary: string;
  category: string;
  subcategory: string;
  tags: string[];
  publishedAt: string;
  updatedAt: string;
  draft: boolean;
  body: {
    raw: string;
  };
};

export type KnowledgeTreeSubcategory = {
  name: string;
  entries: Pick<KnowledgeDoc, "slug" | "title" | "url" | "updatedAt">[];
};

export type KnowledgeTreeCategory = {
  name: string;
  subcategories: KnowledgeTreeSubcategory[];
};

type GetKnowledgeOptions = {
  includeDrafts?: boolean;
};

type KnowledgeFilters = {
  category?: string;
  subcategory?: string;
};

const knowledgeDir = path.join(process.cwd(), "content", "knowledge");

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const normalized: string[] = [];

  value.forEach((entry) => {
    if (typeof entry !== "string") return;
    const trimmed = entry.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    normalized.push(trimmed);
  });

  return normalized;
}

function normalizeText(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

function normalizeKnowledge(data: Record<string, unknown>, body: string, fileName: string): KnowledgeDoc {
  const fileSlug = fileName.replace(/\.mdx?$/i, "");
  const slug = normalizeText(data.slug, fileSlug);
  const now = new Date().toISOString();
  const publishedAt = normalizeText(data.publishedAt, now);
  const updatedAt = normalizeText(data.updatedAt, publishedAt);

  return {
    _id: slug,
    url: `/knowledge/${slug}`,
    title: normalizeText(data.title, slug),
    slug,
    summary: normalizeText(data.summary, ""),
    category: normalizeText(data.category, "General"),
    subcategory: normalizeText(data.subcategory, "General"),
    tags: normalizeStringArray(data.tags),
    publishedAt,
    updatedAt,
    draft: Boolean(data.draft),
    body: {
      raw: body
    }
  };
}

function readKnowledgeFromDisk(): KnowledgeDoc[] {
  if (!fs.existsSync(knowledgeDir)) return [];

  const files = fs
    .readdirSync(knowledgeDir)
    .filter((file) => file.endsWith(".mdx") || file.endsWith(".md"))
    .sort();

  return files.map((file) => {
    const fullPath = path.join(knowledgeDir, file);
    const source = fs.readFileSync(fullPath, "utf8");
    const parsed = matter(source);
    return normalizeKnowledge(parsed.data as Record<string, unknown>, parsed.content, file);
  });
}

function sortByUpdatedAt(entries: KnowledgeDoc[]) {
  return entries.sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime() || a.title.localeCompare(b.title)
  );
}

function equalsIgnoreCase(a: string, b: string) {
  return a.localeCompare(b, undefined, { sensitivity: "base" }) === 0;
}

export function getKnowledge(options: GetKnowledgeOptions = {}) {
  const entries = sortByUpdatedAt(readKnowledgeFromDisk());
  if (options.includeDrafts) return entries;
  return entries.filter((entry) => !entry.draft);
}

export function getKnowledgeBySlug(slug: string, options: GetKnowledgeOptions = {}) {
  return getKnowledge(options).find((entry) => entry.slug === slug);
}

export function filterKnowledge(entries: KnowledgeDoc[], filters: KnowledgeFilters = {}) {
  const { category, subcategory } = filters;

  return entries.filter((entry) => {
    if (category && !equalsIgnoreCase(entry.category, category)) {
      return false;
    }
    if (subcategory && !equalsIgnoreCase(entry.subcategory, subcategory)) {
      return false;
    }
    return true;
  });
}

export function getKnowledgeTree(entries: KnowledgeDoc[]): KnowledgeTreeCategory[] {
  const categoryMap = new Map<string, Map<string, Pick<KnowledgeDoc, "slug" | "title" | "url" | "updatedAt">[]>>();

  entries.forEach((entry) => {
    if (!categoryMap.has(entry.category)) {
      categoryMap.set(entry.category, new Map());
    }

    const subcategories = categoryMap.get(entry.category)!;
    if (!subcategories.has(entry.subcategory)) {
      subcategories.set(entry.subcategory, []);
    }

    subcategories.get(entry.subcategory)!.push({
      slug: entry.slug,
      title: entry.title,
      url: entry.url,
      updatedAt: entry.updatedAt
    });
  });

  const sortNavEntries = (
    subcategoryEntries: Pick<KnowledgeDoc, "slug" | "title" | "url" | "updatedAt">[]
  ) =>
    [...subcategoryEntries].sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime() || a.title.localeCompare(b.title)
    );

  return Array.from(categoryMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, subcategoriesMap]) => ({
      name: category,
      subcategories: Array.from(subcategoriesMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([subcategory, subcategoryEntries]) => ({
          name: subcategory,
          entries: sortNavEntries(subcategoryEntries)
        }))
    }));
}
