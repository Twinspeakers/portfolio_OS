#!/usr/bin/env node

import { execSync } from "node:child_process";

const CORE_CHANGE_PATTERNS = [
  /^app\/globals\.css$/,
  /^app\/layout\.tsx$/,
  /^app\/\(site\)\//,
  /^app\/editor\//,
  /^components\/(cards|layout|projects|three)\//,
  /^lib\/site-data\.ts$/,
  /^tailwind\.config\.ts$/
];

const DOC_UPDATE_PATTERNS = [
  /^docs\//,
  /^README\.md$/
];

function run(command) {
  try {
    return execSync(command, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    }).trim();
  } catch {
    return "";
  }
}

function parseFileList(raw) {
  if (!raw) return [];
  return raw
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean)
    .map((file) => file.replaceAll("\\", "/"));
}

function getChangedFiles() {
  const baseRef = process.env.GITHUB_BASE_REF;
  if (baseRef) {
    const inCi = parseFileList(run(`git diff --name-only origin/${baseRef}...HEAD`));
    if (inCi.length > 0) {
      return inCi;
    }
  }

  const staged = parseFileList(run("git diff --name-only --cached"));
  if (staged.length > 0) {
    return staged;
  }

  const working = parseFileList(run("git diff --name-only"));
  if (working.length > 0) {
    const untracked = parseFileList(run("git ls-files --others --exclude-standard"));
    return Array.from(new Set([...working, ...untracked]));
  }

  const headDelta = parseFileList(run("git diff --name-only HEAD~1...HEAD"));
  const untracked = parseFileList(run("git ls-files --others --exclude-standard"));
  return Array.from(new Set([...headDelta, ...untracked]));
}

const changedFiles = getChangedFiles();
const coreChanges = changedFiles.filter((file) => CORE_CHANGE_PATTERNS.some((pattern) => pattern.test(file)));
const docsTouched = changedFiles.some((file) => DOC_UPDATE_PATTERNS.some((pattern) => pattern.test(file)));

if (coreChanges.length === 0) {
  console.log("docs-sync: no core UI/system changes detected.");
  process.exit(0);
}

if (docsTouched) {
  console.log("docs-sync: core changes detected and docs were updated.");
  process.exit(0);
}

console.error("docs-sync: core UI/system files changed without docs update.\n");
console.error("Core files changed:");
for (const file of coreChanges) {
  console.error(`- ${file}`);
}

console.error("\nUpdate at least one docs artifact before merge:");
console.error("- docs/context/SESSION_LOG.md");
console.error("- docs/design/DESIGN_SYSTEM.md");
console.error("- docs/roadmap/INTEGRATION_ROADMAP.md");
console.error("- docs/adr/*.md (for major decisions)");
console.error("- README.md");

process.exit(1);
