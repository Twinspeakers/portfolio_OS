# Future-Proofing Playbook

This checklist is aimed at avoiding context loss, duplicated work over time, and fragile integrations.

## 1) Context Durability

- Maintain a short `PROJECT_CONTEXT.md` as first-read bootstrap.
- Keep `SESSION_LOG.md` updated after every meaningful implementation pass.
- Use ADRs for decisions that should survive team/tool turnover.

## 2) Contract Stability

- Define schema contracts for:
  - `lib/site-data.ts` (quick links/nav)
  - `content/projects/*.mdx` frontmatter
- Add a validation script that fails CI on contract drift.

## 3) Integration Readiness

- Document external dependencies (icon sources, embeds, APIs).
- Track fallback behavior for remote failures (broken links/icons).
- Prefer stable, versioned sources over implicit scraping.

## 4) Time-Scale Redundancy Controls

- Record why decisions were made, not only what changed.
- Include exact dates in major docs updates.
- Add a simple deprecation policy (mark old pattern, replacement, removal date).

## 5) Release and Recovery

- Add release checklist: lint, build, smoke-test critical routes.
- Add rollback notes for high-risk UI/system changes.
- Keep changelog-style summaries for externally visible behavior shifts.

## 6) Quality Automation

- Add visual regression snapshots for shared cards/layout shell.
- Add Lighthouse/performance budget checks in CI.
- Add link-check automation for `quickLinks` and project links.

## 7) AI-Agent Reliability

- Keep docs concise and highly structured.
- Maintain clear read order (`docs/README.md`).
- Keep implementation decisions linked to file paths and ADR IDs.

## 8) Evolution Without Weight

- Gate new features with a lightweightness check:
  - route-local JS only
  - static-first rendering
  - clear rollback/removal path
- Prefer content-driven extensibility over persistent global runtime systems.
- Require each new section to define:
  - purpose
  - expected usage frequency
  - performance budget impact
  - maintenance owner/path
