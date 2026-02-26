# ADR 0001: 2026 Visual Overhaul System

- Date: 2026-02-25
- Status: accepted
- Owners: product + implementation team

## Context

The prior interface had inconsistent styling depth and weaker visual identity across pages.  
The project needed a stronger, coherent design direction suitable for a modern product-style portfolio.

## Decision

Adopt a shared visual system centered on:

- New global tokens in `app/globals.css`
- Energetic dark palette with cyan/amber accents
- Unified surface primitives (`surface-*`, `card-hover`, `accent-frame`)
- Updated shell/nav active-state language
- Stronger typography pairing (`Sora` + `JetBrains Mono`)

## Alternatives Considered

1. Keep existing style and perform only minor card tweaks.
2. Introduce a third-party UI kit/theme package.
3. Full bespoke system using existing Tailwind structure (chosen).

## Consequences

- Positive:
  - Consistent visual language across Dashboard, Links, Projects, Lab, and Editor.
  - Clearer hierarchy and stronger brand personality.
- Tradeoffs:
  - More custom CSS primitives to maintain.
  - Need to keep gradients and contrast audited over time.
- Follow-up:
  - Add visual regression snapshots.
  - Introduce automated color contrast checks for major components.

## References

- `app/globals.css`
- `app/layout.tsx`
- `components/layout/*`
- `components/cards/*`
