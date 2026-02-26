# Documentation System

This folder is the long-term memory for the project.  
It is designed for both humans and AI agents to recover context quickly after long gaps.

## Read Order (Fast Bootstrap)

1. [`context/PRODUCT_VISION.md`](./context/PRODUCT_VISION.md)
2. [`context/PROJECT_CONTEXT.md`](./context/PROJECT_CONTEXT.md)
3. [`design/DESIGN_SYSTEM.md`](./design/DESIGN_SYSTEM.md)
4. [`roadmap/INTEGRATION_ROADMAP.md`](./roadmap/INTEGRATION_ROADMAP.md)
5. [`roadmap/KNOWLEDGE_HUB_PLAN.md`](./roadmap/KNOWLEDGE_HUB_PLAN.md)
6. [`roadmap/FISHTANK_ECOSYSTEM_SYSTEM.md`](./roadmap/FISHTANK_ECOSYSTEM_SYSTEM.md)
7. Latest ADR in [`adr/`](./adr/)
8. [`context/SESSION_LOG.md`](./context/SESSION_LOG.md)

## Folder Map

- `context/`
  - Product vision, project snapshot, constraints, and session continuity.
- `design/`
  - Visual language, token intent, and component-level design rules.
- `roadmap/`
  - Multi-phase build roadmap for large integrations.
- `adr/`
  - Architecture Decision Records (immutable decision history).
- `ops/`
  - Future-proofing and maintenance playbooks.

## Update Protocol

When shipping meaningful changes:

1. Add or update an ADR (if architecture/design direction changed).
2. Update design documentation if tokens/components changed.
3. Update roadmap status for affected milestones.
4. Add a short session entry in `context/SESSION_LOG.md`.
5. If scope or purpose shifts, update `context/PRODUCT_VISION.md`.

## Naming Rules

- ADR files: `####-short-kebab-title.md` (example: `0002-data-sync-strategy.md`)
- Keep docs concise and high-signal.
- Prefer exact dates (`YYYY-MM-DD`) and concrete decisions over vague notes.
