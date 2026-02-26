# Project Context

## One-Line Summary

Portfolio OS is an evolving portfolio + personal operating system built with Next.js for projects, quick links, and long-term knowledge capture.

See also: [`PRODUCT_VISION.md`](./PRODUCT_VISION.md)

## Current Product Shape

- Routes:
  - `/` Dashboard
  - `/projects` + `/projects/[slug]`
  - `/links`
  - `/knowledge` + `/knowledge/[slug]`
- Data sources:
  - Project content from `content/projects/*.mdx`
  - Knowledge writing content from `content/knowledge/*.mdx` (category/subcategory organized)
  - Navigation + quick links from `lib/site-data.ts`

## Core Use Cases

- Track and present shipped work and outcomes
- Quickly recover links/tools/projects without losing context over time
- Grow into a knowledge graph (notes/articles/wiki references) with cross-links
- Publish free-form blog entries while preserving wiki-style discoverability

## Technical Snapshot

- Framework: Next.js 15 (App Router), TypeScript
- Styling: Tailwind CSS + CSS variables in `app/globals.css`
- Rendering model: static export (`output: "export"`) for GitHub Pages
- 3D strategy: route-scoped only via adapter contracts in `lib/3d/*` (Babylon preferred when 3D is needed)

## Key Constraints

- Static hosting constraints apply (no server-only runtime assumptions).
- Prefer resilient URLs/assets because quick links/icons may change externally.
- Keep pages fast and responsive on desktop + mobile.
- Preserve low runtime overhead as new sections are added.

## Design Direction (Current)

- Energetic, confident, futuristic dark UI with cyan/amber-driven accents.
- Glassy layered surfaces + strong active states.
- Shared design primitives centralized in global CSS utility classes.

## Source of Truth Files

- Global tokens/surfaces: `app/globals.css`
- App shell/navigation: `components/layout/*`
- Shared cards: `components/cards/*`
- Link + nav data: `lib/site-data.ts`

## Open Areas

- Convert critical `<img>` usage to `next/image` where practical.
- Add a stable icon strategy for external link logos (to reduce remote dependency drift).
- Define product analytics and performance baselines for future releases.
- Add Knowledge Hub Phase B (internal link extraction, backlinks, and broken-link warnings).
