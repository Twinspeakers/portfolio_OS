# Integration Roadmap

Status legend: `[todo]`, `[in-progress]`, `[done]`, `[blocked]`

## Phase 1: Foundation Hardening

- `[in-progress]` Stabilize design system primitives and token ownership.
- `[todo]` Eliminate scattered one-off styles by converging on shared utilities.
- `[todo]` Reduce external runtime dependencies for critical visuals (icons/assets).
- `[todo]` Add baseline performance budget targets (LCP, CLS, JS payload).
- `[done]` Enforce docs update gate for core UI/system changes in CI.

## Phase 2: Content + Data Scale

- `[done]` Formalize MDX frontmatter contract and validation script.
- `[todo]` Add content QA checks (missing cover, bad links, invalid tags).
- `[done]` Introduce typed config checks for quick links and nav schemas.

## Phase 3: Product Integrations

- `[todo]` Add analytics instrumentation and event taxonomy.
- `[todo]` Add feature flags for experimental UI systems.
- `[in-progress]` Define integration adapters (APIs, webhooks, feeds, 3D engine boundaries).
- `[in-progress]` Add Knowledge Hub (`/knowledge`) as blog/wiki hybrid with cross-linking.
- `[in-progress]` Define and ship fish-banner ecosystem simulation baseline (Phase A first pass complete, further behavior depth pending).

## Phase 4: Reliability + Governance

- `[todo]` Add ADR cadence for major technical or product decisions.
- `[todo]` Add release checklist and rollback strategy docs.
- `[todo]` Add dependency/update policy with security audit cadence.

## Next 30-Day Targets

1. Convert key `<img>` usage to optimized image strategy.
2. Add CI stale-doc detection (last updated SLA + required sections).
3. Add link-check automation for project links and quick links.
4. Ship Knowledge Hub Phase B (link extraction + backlinks + broken-link warnings).
5. Start Fish Ecosystem Phase A (ecology core + species registry + consequence metrics).
