# Session Log

Chronological high-signal log of meaningful product/architecture changes.

## 2026-02-25

- Reworked Dashboard quick links to be pinned-driven.
- Refactored link cards into two-column icon/content layout.
- Added per-link gradient theme metadata in `lib/site-data.ts`.
- Improved icon quality via explicit `iconSrc` overrides for GitHub/Reaper.
- Executed large visual overhaul:
  - New global theme tokens, atmosphere, and surface system.
  - Updated shell/navigation active states and controls.
  - Restyled shared cards and page-level sections.
  - Introduced display/mono font pairing in root layout.
- Added CI quality gates:
  - Docs-sync enforcement on core UI/system changes (`scripts/check-doc-updates.mjs` + `.github/workflows/quality-gates.yml`).
  - Schema validation for `content/projects/*.mdx` and `lib/site-data.ts` (`scripts/validate-content-and-site-data.mjs`).
- Removed `/editor` and `/lab` features entirely:
  - Deleted their routes and heavy client/3D implementations.
  - Removed `react-three` and CodeMirror dependency groups.
  - Re-enabled route prefetching in navigation for faster click-to-response.
- Captured long-term product direction in docs:
  - Portfolio OS explicitly defined as an evolving portfolio + personal operating system.
  - Added modular growth principles so structure is not constrained by original one-shot generation.
  - Added Knowledge Hub roadmap (`/knowledge`) for blog/wiki hybrid with cross-linking.
- Added 3D architecture direction:
  - New ADR 0002: no global 3D runtime; route-scoped 3D only, Babylon preferred.
  - Added `lib/3d` adapter scaffold (`adapter`, `registry`, `noop`, `babylon` placeholder).
- Shipped Knowledge Hub Phase A:
  - Added static routes `/knowledge` and `/knowledge/[slug]`.
  - Added typed knowledge loader at `lib/content/knowledge.ts`.
  - Added starter entries under `content/knowledge/*.mdx`.
  - Added Knowledge cards/badges and dashboard "Knowledge Pulse" integration.
  - Extended validation script to enforce knowledge frontmatter schema.
- Pivoted Knowledge Hub to blog/wiki mode:
  - Replaced `kind`-based metadata with `category` + `subcategory` schema.
  - Redesigned `/knowledge` and `/knowledge/[slug]` into two-column layouts with a right-side wiki tree.
  - Removed related-entry/kind badge UI and added filter-driven wiki navigation.
  - Added `npm run new:knowledge` scaffold command for faster MDX authoring.
- Added prompt composition tools:
  - New `/prompt-builder` route with a clickable glossary term palette.
  - Added typed glossary object catalog and composition rules for coherent prompt paragraph generation.
  - Added one-click full prompt copy and clear actions for rapid iteration.
- Updated build base-path behavior:
  - GitHub Pages prefix now defaults only in CI (`GITHUB_ACTIONS`), not all local production builds.
  - Added `BASE_PATH` override support for explicit prefixed local builds when needed.
- Removed prompt composition tools from this app:
  - Deleted `/prompt-builder` route and related prompt-builder components/libs.
  - Removed Prompt navigation item and glossary-builder link from wiki content.
  - Decision: keep prompt tooling as a candidate for a dedicated standalone app.
- Implemented Babylon hero scene on Dashboard:
  - Replaced static-only hero background with a route-scoped Babylon canvas layer.
  - Wired runtime scene mount/resize/dispose through the existing `lib/3d` adapter scaffold.
  - Kept static gradient overlays and text stack for graceful visual fallback.

## 2026-02-26

- Reworked Dashboard hero scene from planet/orbit motif to fish-based motion theme.
- Tuned fish scene movement coverage to better utilize banner bounds and maintain cohesive visual balance with the site palette.
- Documented pre-implementation ecosystem architecture for long-term extensibility:
  - Added `docs/roadmap/FISHTANK_ECOSYSTEM_SYSTEM.md`.
  - Defined species/fish/tank contracts, consequence engine, behavior states, phase plan, and performance envelope.
- Implemented Fish Ecosystem Phase A baseline:
  - Added data-first simulation modules under `lib/ecosystem/*`.
  - Wired Babylon fish creation to ecosystem entities so every rendered fish belongs to simulation state.
  - Added deterministic ecology stepping (stress, energy, health, behavior switching, tank pressure metrics).
  - Reduced default fish population to 7 for cleaner presentation and lower overhead.
  - Upgraded procedural fish fidelity with higher-poly body/head meshes, rigged fins/tails, eye meshes, and a shared 2k procedural scale texture.
- Replaced placeholder top search with a real site-wide search workflow:
  - Added server-built search index from projects, knowledge, nav pages, and quick links.
  - Wired search index through `(site)` layout into client `TopBar`.
  - Added query input, ranked results, keyboard navigation, and `Ctrl/Cmd+K` + `/` focus shortcuts.
- Upgraded top search ranking and UX:
  - Added fuzzy token scoring with typo tolerance (edit-distance cutoff).
  - Added grouped result sections (Projects, Knowledge, Quick Links, Pages) while retaining keyboard traversal.
- Tightened search relevance for short queries and expanded index depth:
  - Reduced single-character query noise by requiring stronger direct token/title matches.
  - Added MDX heading/link/body-term signal extraction so subsection content and cross-links can influence results.
- Switched search to stricter matching behavior:
  - Enforced minimum query length (2 chars) before returning results.
  - Required each query token to have a meaningful match (strict all-token matching) to avoid broad weak suggestions.
  - Removed generic body-term flood from index extraction; kept focused heading/link/wiki-link signals.
- Added quick-link deep-link support for targeted external destinations:
  - Extended `QuickLink` schema with optional `deepLinks` entries.
  - Added starter deep links in `lib/site-data.ts` (GitHub, VS Code, Blender, Reaper, Google suite).
  - Included deep links in search index so subpages are directly searchable from top search.
  - Extended site-data validation to enforce deep-link schema correctness.

## Entry Template

```md
## YYYY-MM-DD
- What changed (feature/design/architecture)
- Why it changed
- Files or systems impacted
- Follow-ups / known risks
```
