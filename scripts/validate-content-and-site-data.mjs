#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import matter from "gray-matter";
import ts from "typescript";

const root = process.cwd();
const projectDir = path.join(root, "content", "projects");
const knowledgeDir = path.join(root, "content", "knowledge");
const siteDataPath = path.join(root, "lib", "site-data.ts");

const errors = [];
const warnings = [];

function addError(message) {
  errors.push(message);
}

function addWarning(message) {
  warnings.push(message);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidDateString(value) {
  if (!isNonEmptyString(value)) return false;
  return !Number.isNaN(new Date(value).getTime());
}

function isValidUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function checkLocalAssetPath(sourcePath, contextLabel) {
  if (!sourcePath.startsWith("/")) return;
  const normalized = sourcePath.replace(/^\/+/, "");
  const fullPath = path.join(root, "public", normalized);
  if (!fs.existsSync(fullPath)) {
    addError(`${contextLabel}: local asset not found at public/${normalized}`);
  }
}

function validateProjectFrontmatter() {
  const projectSlugs = new Set();

  if (!fs.existsSync(projectDir)) {
    addError("content/projects directory does not exist.");
    return projectSlugs;
  }

  const allowedStatus = new Set(["active", "paused", "done"]);
  const files = fs
    .readdirSync(projectDir)
    .filter((file) => file.endsWith(".mdx") || file.endsWith(".md"))
    .sort();

  const slugToFile = new Map();

  for (const fileName of files) {
    const fullPath = path.join(projectDir, fileName);
    const raw = fs.readFileSync(fullPath, "utf8");
    const parsed = matter(raw);
    const data = parsed.data ?? {};
    const label = `content/projects/${fileName}`;

    if (!isNonEmptyString(data.title)) {
      addError(`${label}: missing or invalid "title" (non-empty string required).`);
    }

    if (!isNonEmptyString(data.slug)) {
      addError(`${label}: missing or invalid "slug" (non-empty string required).`);
    } else {
      const slug = String(data.slug);
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
        addError(`${label}: "slug" must be kebab-case alphanumeric.`);
      }

      if (slugToFile.has(slug)) {
        addError(`${label}: duplicate slug "${slug}" also used by ${slugToFile.get(slug)}.`);
      } else {
        slugToFile.set(slug, label);
        projectSlugs.add(slug);
      }

      const fileSlug = fileName.replace(/\.(md|mdx)$/i, "");
      if (slug !== fileSlug) {
        addWarning(`${label}: slug "${slug}" differs from filename slug "${fileSlug}".`);
      }
    }

    if (!isNonEmptyString(data.summary)) {
      addError(`${label}: missing or invalid "summary" (non-empty string required).`);
    }

    if (!allowedStatus.has(String(data.status))) {
      addError(`${label}: "status" must be one of active | paused | done.`);
    }

    if (!Array.isArray(data.tags) || data.tags.length === 0 || data.tags.some((item) => !isNonEmptyString(item))) {
      addError(`${label}: "tags" must be a non-empty array of strings.`);
    }

    if (!Array.isArray(data.stack) || data.stack.length === 0 || data.stack.some((item) => !isNonEmptyString(item))) {
      addError(`${label}: "stack" must be a non-empty array of strings.`);
    }

    if (typeof data.featured !== "boolean") {
      addError(`${label}: "featured" must be a boolean.`);
    }

    if (!isValidDateString(data.updatedAt)) {
      addError(`${label}: "updatedAt" must be a valid date string.`);
    }

    if (data.createdAt != null && !isValidDateString(data.createdAt)) {
      addError(`${label}: "createdAt" must be a valid date string when provided.`);
    }

    if (data.cover != null && !isNonEmptyString(data.cover)) {
      addError(`${label}: "cover" must be a non-empty string when provided.`);
    }

    if (isNonEmptyString(data.cover)) {
      checkLocalAssetPath(String(data.cover), `${label} cover`);
    }

    if (data.coverAlt != null && !isNonEmptyString(data.coverAlt)) {
      addError(`${label}: "coverAlt" must be a non-empty string when provided.`);
    }

    if (data.gallery != null) {
      if (!Array.isArray(data.gallery)) {
        addError(`${label}: "gallery" must be an array when provided.`);
      } else {
        data.gallery.forEach((entry, index) => {
          const itemLabel = `${label} gallery[${index}]`;

          if (typeof entry === "string") {
            if (!isNonEmptyString(entry)) {
              addError(`${itemLabel}: string entry must be non-empty.`);
            } else {
              checkLocalAssetPath(entry, itemLabel);
            }
            return;
          }

          if (!entry || typeof entry !== "object") {
            addError(`${itemLabel}: entry must be a string or object.`);
            return;
          }

          const src = isNonEmptyString(entry.src) ? entry.src : isNonEmptyString(entry.url) ? entry.url : "";
          if (!src) {
            addError(`${itemLabel}: requires non-empty "src" (or "url").`);
          } else {
            checkLocalAssetPath(src, itemLabel);
          }

          if (entry.alt != null && !isNonEmptyString(entry.alt)) {
            addError(`${itemLabel}: "alt" must be a non-empty string when provided.`);
          }

          if (entry.caption != null && !isNonEmptyString(entry.caption)) {
            addError(`${itemLabel}: "caption" must be a non-empty string when provided.`);
          }
        });
      }
    }

    if (data.links != null) {
      if (!data.links || typeof data.links !== "object" || Array.isArray(data.links)) {
        addError(`${label}: "links" must be an object when provided.`);
      } else {
        const entries = Object.entries(data.links);
        for (const [key, value] of entries) {
          if (!["repo", "live", "docs"].includes(key)) {
            addWarning(`${label}: links contains unknown key "${key}".`);
          }

          if (value == null || value === "") continue;
          if (!isNonEmptyString(value)) {
            addError(`${label}: links.${key} must be a string.`);
            continue;
          }

          if (String(value).includes("<")) {
            addWarning(`${label}: links.${key} looks like a placeholder URL (${value}).`);
            continue;
          }

          if (!isValidUrl(String(value))) {
            addError(`${label}: links.${key} must be a valid http(s) URL.`);
          }
        }
      }
    }
  }

  return projectSlugs;
}

function validateKnowledgeFrontmatter() {
  if (!fs.existsSync(knowledgeDir)) {
    addError("content/knowledge directory does not exist.");
    return;
  }

  const files = fs
    .readdirSync(knowledgeDir)
    .filter((file) => file.endsWith(".mdx") || file.endsWith(".md"))
    .sort();

  if (files.length === 0) {
    addWarning("content/knowledge has no entries yet.");
    return;
  }

  const slugToFile = new Map();

  for (const fileName of files) {
    const fullPath = path.join(knowledgeDir, fileName);
    const raw = fs.readFileSync(fullPath, "utf8");
    const parsed = matter(raw);
    const data = parsed.data ?? {};
    const label = `content/knowledge/${fileName}`;

    if (!isNonEmptyString(data.title)) {
      addError(`${label}: missing or invalid "title" (non-empty string required).`);
    }

    if (!isNonEmptyString(data.slug)) {
      addError(`${label}: missing or invalid "slug" (non-empty string required).`);
    } else {
      const slug = String(data.slug);
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
        addError(`${label}: "slug" must be kebab-case alphanumeric.`);
      }

      if (slugToFile.has(slug)) {
        addError(`${label}: duplicate slug "${slug}" also used by ${slugToFile.get(slug)}.`);
      } else {
        slugToFile.set(slug, label);
      }

      const fileSlug = fileName.replace(/\.(md|mdx)$/i, "");
      if (slug !== fileSlug) {
        addWarning(`${label}: slug "${slug}" differs from filename slug "${fileSlug}".`);
      }
    }

    if (!isNonEmptyString(data.summary)) {
      addError(`${label}: missing or invalid "summary" (non-empty string required).`);
    }

    if (!isNonEmptyString(data.category)) {
      addError(`${label}: missing or invalid "category" (non-empty string required).`);
    }

    if (!isNonEmptyString(data.subcategory)) {
      addError(`${label}: missing or invalid "subcategory" (non-empty string required).`);
    }

    if (!Array.isArray(data.tags) || data.tags.length === 0 || data.tags.some((item) => !isNonEmptyString(item))) {
      addError(`${label}: "tags" must be a non-empty array of strings.`);
    }

    if (!isValidDateString(data.publishedAt)) {
      addError(`${label}: "publishedAt" must be a valid date string.`);
    }

    if (!isValidDateString(data.updatedAt)) {
      addError(`${label}: "updatedAt" must be a valid date string.`);
    }

    if (data.draft != null && typeof data.draft !== "boolean") {
      addError(`${label}: "draft" must be a boolean when provided.`);
    }

    if (!isNonEmptyString(parsed.content)) {
      addWarning(`${label}: body content is empty.`);
    }
  }
}

function loadSiteDataModule() {
  if (!fs.existsSync(siteDataPath)) {
    addError("lib/site-data.ts does not exist.");
    return null;
  }

  const source = fs.readFileSync(siteDataPath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    }
  }).outputText;

  const sandbox = {
    module: { exports: {} },
    exports: {},
    require(specifier) {
      throw new Error(`Unexpected require in lib/site-data.ts: ${specifier}`);
    }
  };
  sandbox.exports = sandbox.module.exports;

  vm.runInNewContext(compiled, sandbox, {
    filename: siteDataPath
  });

  return sandbox.module.exports;
}

function isColorToken(value) {
  if (!isNonEmptyString(value)) return false;
  return (
    /^rgba?\(/i.test(value) ||
    /^hsla?\(/i.test(value) ||
    /^#([a-f0-9]{3}|[a-f0-9]{6}|[a-f0-9]{8})$/i.test(value)
  );
}

function validateSiteData() {
  const exported = loadSiteDataModule();
  if (!exported) return;

  const { quickLinks, navItems } = exported;
  const allowedCategories = new Set(["Dev", "Design", "Audio", "Admin"]);

  if (!Array.isArray(quickLinks) || quickLinks.length === 0) {
    addError("lib/site-data.ts: quickLinks must be a non-empty array.");
  } else {
    const seenNames = new Set();
    const seenHrefs = new Set();
    let pinnedCount = 0;

    quickLinks.forEach((item, index) => {
      const label = `lib/site-data.ts quickLinks[${index}]`;

      if (!item || typeof item !== "object") {
        addError(`${label}: entry must be an object.`);
        return;
      }

      if (!isNonEmptyString(item.name)) {
        addError(`${label}: missing or invalid "name".`);
      } else {
        if (seenNames.has(item.name)) {
          addError(`${label}: duplicate name "${item.name}".`);
        }
        seenNames.add(item.name);
      }

      if (!isNonEmptyString(item.href) || !isValidUrl(item.href)) {
        addError(`${label}: "href" must be a valid http(s) URL.`);
      } else {
        if (seenHrefs.has(item.href)) {
          addWarning(`${label}: duplicate href "${item.href}".`);
        }
        seenHrefs.add(item.href);
      }

      if (!allowedCategories.has(item.category)) {
        addError(`${label}: "category" must be one of Dev | Design | Audio | Admin.`);
      }

      if (item.pinned != null && typeof item.pinned !== "boolean") {
        addError(`${label}: "pinned" must be boolean when provided.`);
      }

      if (item.pinned === true) {
        pinnedCount += 1;
      }

      if (item.iconSrc != null) {
        if (!isNonEmptyString(item.iconSrc)) {
          addError(`${label}: "iconSrc" must be a non-empty string when provided.`);
        } else if (!item.iconSrc.startsWith("/") && !isValidUrl(item.iconSrc)) {
          addError(`${label}: "iconSrc" must be an absolute path or valid URL.`);
        }
      }

      if (!item.theme || typeof item.theme !== "object") {
        addError(`${label}: missing "theme" object.`);
      } else {
        if (!isColorToken(item.theme.gradientFrom)) {
          addError(`${label}: theme.gradientFrom must be a color token.`);
        }
        if (!isColorToken(item.theme.gradientTo)) {
          addError(`${label}: theme.gradientTo must be a color token.`);
        }
      }

      if (item.deepLinks != null) {
        if (!Array.isArray(item.deepLinks)) {
          addError(`${label}: "deepLinks" must be an array when provided.`);
        } else {
          item.deepLinks.forEach((deepLink, deepIndex) => {
            const deepLabel = `${label}.deepLinks[${deepIndex}]`;
            if (!deepLink || typeof deepLink !== "object") {
              addError(`${deepLabel}: entry must be an object.`);
              return;
            }

            if (!isNonEmptyString(deepLink.title)) {
              addError(`${deepLabel}: "title" must be a non-empty string.`);
            }

            if (!isNonEmptyString(deepLink.href) || !isValidUrl(deepLink.href)) {
              addError(`${deepLabel}: "href" must be a valid http(s) URL.`);
            }

            if (deepLink.note != null && !isNonEmptyString(deepLink.note)) {
              addError(`${deepLabel}: "note" must be a non-empty string when provided.`);
            }

            if (deepLink.keywords != null) {
              if (!Array.isArray(deepLink.keywords) || deepLink.keywords.some((value) => !isNonEmptyString(value))) {
                addError(`${deepLabel}: "keywords" must be an array of non-empty strings when provided.`);
              }
            }
          });
        }
      }
    });

    if (pinnedCount === 0) {
      addError("lib/site-data.ts: at least one quick link should be pinned.");
    }
  }

  if (!Array.isArray(navItems) || navItems.length === 0) {
    addError("lib/site-data.ts: navItems must be a non-empty array.");
  } else {
    const seenLabels = new Set();
    const seenHrefs = new Set();

    navItems.forEach((item, index) => {
      const label = `lib/site-data.ts navItems[${index}]`;

      if (!item || typeof item !== "object") {
        addError(`${label}: entry must be an object.`);
        return;
      }

      if (!isNonEmptyString(item.label)) {
        addError(`${label}: missing or invalid "label".`);
      } else if (seenLabels.has(item.label)) {
        addError(`${label}: duplicate label "${item.label}".`);
      } else {
        seenLabels.add(item.label);
      }

      if (!isNonEmptyString(item.href) || !item.href.startsWith("/")) {
        addError(`${label}: "href" must be a non-empty absolute route path.`);
      } else if (seenHrefs.has(item.href)) {
        addError(`${label}: duplicate href "${item.href}".`);
      } else {
        seenHrefs.add(item.href);
      }
    });
  }
}

function printReport() {
  if (warnings.length > 0) {
    console.log("Validation warnings:");
    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
    console.log("");
  }

  if (errors.length > 0) {
    console.error("Validation errors:");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log(
    "Validation passed: content/projects and content/knowledge frontmatter plus lib/site-data.ts schema are valid."
  );
}

validateProjectFrontmatter();
validateKnowledgeFrontmatter();
validateSiteData();
printReport();
