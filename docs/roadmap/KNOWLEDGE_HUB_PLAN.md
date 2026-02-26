# Knowledge Hub Plan

## Objective

Build an MDX-first writing area that behaves like:

- a blog for free-form writing
- a wiki for long-term organization

The section should support fast writing, clean reading, and durable navigation over time.

## Product Requirements

- Static-first and lightweight
- MDX as the source of truth
- Right-side wiki tree (categories, subcategories, entries)
- Low-friction authoring workflow
- Clear archive of career direction and future implementation ideas

## Current Information Model

Use `content/knowledge/*.mdx` with frontmatter:

- `title` (string, required)
- `slug` (string, required)
- `summary` (string, required)
- `category` (string, required)
- `subcategory` (string, required)
- `tags` (string[], required)
- `publishedAt` / `updatedAt` (date string, required)
- `draft` (boolean, optional)

## Current UX Pattern

- `/knowledge`
  - blog-style feed in main column
  - wiki tree on right column
  - category and subcategory organization visible in the wiki tree
- `/knowledge/[slug]`
  - article detail in main column
  - persistent wiki tree on right with active entry highlight

## Authoring Workflow

- Edit or create MDX directly in `content/knowledge`.
- Optional scaffold command:
  - `npm run new:knowledge -- --slug my-entry --title "My Entry" --category Career --subcategory Direction`

## Delivery Phases

Status snapshot (as of 2026-02-25):
- `[done]` Phase A: static MDX blog/wiki foundation
- `[todo]` Phase B: internal linking + backlinks
- `[todo]` Phase C: full-text search and richer filtering
- `[todo]` Phase D: publishing workflow polish

### Phase B: Linking Intelligence

- Extract and validate internal links at build time.
- Add backlinks per entry.
- Report broken links in CI.

### Phase C: Retrieval UX

- Add text search by title, summary, tags, and body.
- Add saved filter shortcuts.

### Phase D: Publishing Flow

- Add optional publish checklist (voice, metadata, links).
- Add archive views by month/year and category.
