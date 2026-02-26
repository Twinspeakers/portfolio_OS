# Design System Notes

## Intent

Create a confident, energetic product feel with strong hierarchy, high readability, and cohesive motion/interaction behavior.

## Core Visual Language

- Mood: forward-looking, bold, technical.
- Palette direction: cool electric base with warm accent contrast.
- Surface style: layered glass-like cards with depth and light bleed.
- Interaction style: crisp transitions, visible hover/focus states, high affordance.

## Typography

- Display/UI font: `Sora` (via `next/font`)
- Mono font: `JetBrains Mono`
- Heading style: tighter tracking, stronger weight, larger section anchors.

## Token Source

Primary token source is `app/globals.css` (`:root` CSS variables).

Important groups:

- Base: `--background`, `--foreground`, `--card`, `--border`
- Brand: `--primary`, `--accent`
- Energy accents: `--energy-cyan`, `--energy-amber`, `--energy-lime`, `--energy-rose`
- Editor-specific theme variables

## Shared Utility Primitives

- `.surface-card`, `.surface-elevated`, `.surface-ghost`
- `.card-hover`
- `.accent-frame`
- `.hero-title`
- `.section-kicker`, `.section-title`

## Component Rules

- Prefer shared primitives over ad-hoc card styles.
- Keep active/selected states visually unmistakable.
- Keep gradients intentional and avoid random saturation spikes.
- For external logos/icons, favor quality/stability over automatic scraping.

## Accessibility Baseline

- Maintain readable text contrast against all gradients/surfaces.
- Keep keyboard focus visible on all interactive elements.
- Preserve clear semantic heading structure per page.

## Change Workflow

When changing design direction:

1. Update global tokens/primitives first.
2. Roll through shared layout + shared cards.
3. Patch page-level exceptions last.
4. Record decision in ADR and session log.
