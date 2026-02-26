# ADR 0002: Route-Scoped 3D Engine Policy (Babylon Preferred)

- Date: 2026-02-25
- Status: accepted
- Owners: product + implementation team

## Context

The project was originally generated with broader feature scope and heavier runtime pieces.  
As Portfolio OS evolves, it must stay lightweight while still allowing high-impact technical showcases.

The team has recent positive performance experience with Babylon.js in Atomscape and wants future flexibility without reintroducing global bundle weight.

## Decision

Adopt the following 3D policy:

- No always-on 3D runtime in the base site.
- 3D engines are opt-in per route/feature only.
- Prefer Babylon.js for future 3D features unless a specific requirement justifies another engine.
- Use adapter-based integration (`lib/3d/*`) so engine choice and lifecycle are isolated.

## Alternatives Considered

1. Reintroduce three.js/react-three globally for visual flair.
2. Maintain no 3D capability scaffold at all.
3. Keep site lightweight and add route-scoped Babylon via adapter pattern (chosen).

## Consequences

- Positive:
  - Preserves fast navigation and low baseline runtime.
  - Keeps path open for advanced 3D features when product value is clear.
  - Reduces lock-in by standardizing around adapter contracts.
- Tradeoffs:
  - Initial Babylon scenes require explicit wiring.
  - Slight upfront architecture overhead for adapter abstraction.
- Follow-up:
  - Implement first route-scoped Babylon scene only when tied to a concrete user-facing workflow.
  - Add performance budgets for any new 3D route before merge.

## References

- `lib/3d/adapter.ts`
- `lib/3d/registry.ts`
- `lib/3d/noop-adapter.ts`
- `lib/3d/babylon-adapter.ts`
