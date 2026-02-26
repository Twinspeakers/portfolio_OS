# Product Vision

## Why This Project Exists

Portfolio OS is not a one-time portfolio site.  
It is an evolving system that should continuously reflect growing skills, shipped work, and technical maturity over time.

## Origin Context

- The initial project was generated from a single large prompt.
- That gave the project a specific early structure.
- That structure is not a permanent constraint.

The product should evolve intentionally as needs change, without inheriting accidental limitations from early scaffolding.

## Core Purpose (Dual Role)

1. Public signal:
   - A living, high-quality expression of skills, outcomes, and execution quality.
2. Personal operating system:
   - A practical workspace to quickly access tools, projects, links, references, and knowledge that would otherwise be lost over time.

## Evolution Principles

- Build for change:
  - New capabilities should be additive and modular, not entangled with existing routes.
- Keep it lightweight:
  - Prefer static/content-driven features and route-level isolation over global client complexity.
- Keep it useful:
  - Every major feature should solve a recurring personal workflow problem.
- Keep it maintainable:
  - Decisions should be documented so future versions can be reasoned about quickly.
- Allow removal:
  - Features that no longer serve the mission should be easy to retire.

## Product Standard for New Features

A new feature is justified when it is:

- Reusable (used more than once or expected to be reused often)
- Discoverable (findable from navigation/search/linking)
- Low-overhead (minimal runtime and maintenance cost)
- Integrative (connects with existing content/knowledge graph)

## Planned Direction

Next major capability is a **Knowledge Hub**:

- Half blog, half wiki
- Strong internal cross-linking across notes, projects, and tools
- Designed for long-term recall and retrieval, not only publishing

See [`roadmap/KNOWLEDGE_HUB_PLAN.md`](../roadmap/KNOWLEDGE_HUB_PLAN.md) for implementation details.

## Non-Goals

- Shipping features only for novelty
- Building heavy runtime systems for low-frequency workflows
- Letting visual complexity or architecture drift obscure usability
