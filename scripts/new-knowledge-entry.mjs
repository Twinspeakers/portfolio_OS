#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const argv = process.argv.slice(2);

function getArg(name) {
  const flag = `--${name}`;
  const exactIndex = argv.findIndex((arg) => arg === flag);
  if (exactIndex >= 0) {
    return argv[exactIndex + 1];
  }

  const inline = argv.find((arg) => arg.startsWith(`${flag}=`));
  return inline ? inline.slice(flag.length + 1) : undefined;
}

function toKebabCase(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function printUsage() {
  console.log("Usage:");
  console.log(
    "  npm run new:knowledge -- --slug my-entry --title \"My Entry\" --category Career --subcategory Direction"
  );
}

const title = getArg("title");
const category = getArg("category");
const subcategory = getArg("subcategory");
const slugInput = getArg("slug") ?? (title ? toKebabCase(title) : undefined);
const slug = slugInput ? toKebabCase(slugInput) : undefined;

if (!title || !category || !subcategory || !slug) {
  console.error("Missing required arguments.");
  printUsage();
  process.exit(1);
}

if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
  console.error('Invalid slug. Use kebab-case, e.g. "future-build-plan".');
  process.exit(1);
}

const now = new Date().toISOString().slice(0, 10);
const knowledgeDir = path.join(process.cwd(), "content", "knowledge");
const outputPath = path.join(knowledgeDir, `${slug}.mdx`);

if (!fs.existsSync(knowledgeDir)) {
  fs.mkdirSync(knowledgeDir, { recursive: true });
}

if (fs.existsSync(outputPath)) {
  console.error(`Entry already exists: content/knowledge/${slug}.mdx`);
  process.exit(1);
}

const template = `---
title: "${title}"
slug: "${slug}"
summary: ""
category: "${category}"
subcategory: "${subcategory}"
tags: ["blog"]
publishedAt: "${now}"
updatedAt: "${now}"
draft: true
---

## Why This Entry Exists

Write your first section here.
`;

fs.writeFileSync(outputPath, template, "utf8");
console.log(`Created content/knowledge/${slug}.mdx`);
