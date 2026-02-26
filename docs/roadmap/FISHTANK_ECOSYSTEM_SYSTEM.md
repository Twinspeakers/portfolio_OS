# Fishtank Ecosystem System (Proposed)

Date: 2026-02-26  
Status: Phase A baseline implemented (first pass)

## 1) Goal

Create a living banner ecosystem where adding fish has meaningful consequences over time:

- Behavior changes (schooling, stress, territory, rest)
- Health changes (energy, stress, resilience)
- Tank-wide changes (water quality, crowding pressure, harmony)

The system must stay lightweight, deterministic enough for debugging, and easy to extend with new species.

## 2) Product Rules

- New fish cannot be "free": each addition modifies ecosystem load and social dynamics.
- Species have explicit traits; no hidden magic numbers in render code.
- Simulation is data-first and decoupled from Babylon rendering.
- Effects should be visible: movement patterns, spacing, pacing, and interaction frequency.
- The banner must remain performant on desktop and mobile.

## 3) Core Data Model

```ts
type SpeciesId = string;
type FishId = string;

type SpeciesProfile = {
  id: SpeciesId;
  label: string;
  sizeClass: "small" | "medium" | "large";
  schooling: 0 | 1 | 2 | 3; // none -> strong schooling
  temperament: 0 | 1 | 2 | 3; // peaceful -> aggressive
  territoryNeed: number; // 0..1
  activity: number; // 0..1
  preferredDepth: "top" | "mid" | "bottom";
  bioload: number; // load contribution per fish
  oxygenUse: number; // oxygen demand contribution
  compatibilityTags: string[]; // e.g. ["community", "fin-nipper", "predator"]
};

type FishState = {
  id: FishId;
  speciesId: SpeciesId;
  ageDays: number;
  energy: number; // 0..1
  stress: number; // 0..1
  health: number; // 0..1
  hunger: number; // 0..1
  behavior: "cruise" | "school" | "inspect" | "hover" | "dart" | "rest" | "avoid" | "chase";
};

type TankState = {
  timestampMs: number;
  waterQuality: number; // 0..1
  oxygenLevel: number; // 0..1
  crowding: number; // 0..1
  aggressionPressure: number; // 0..1
  harmony: number; // 0..1
};
```

## 4) Consequence Engine

Every ecology tick recalculates tank pressures from all fish, then updates each fish state.

### Tank-Wide Calculations

- `bioloadTotal = sum(species.bioload * fishCountBySpecies)`
- `oxygenDemand = sum(species.oxygenUse * fishCountBySpecies)`
- `capacity = baseCapacity * filtrationFactor * habitatFactor`
- `loadRatio = bioloadTotal / capacity`
- `crowding = clamp((loadRatio - 0.8) / 0.7, 0, 1)`
- `oxygenLevel = clamp(1 - oxygenDemand / oxygenCapacity, 0, 1)`
- `aggressionPressure = weighted(temperament mix, territory overlap, crowding)`
- `waterQuality` decays with load and recovers slowly over time
- `harmony = 1 - weighted(crowding, aggressionPressure, incompatibilityIndex)`

### Fish-Level Updates

- Stress increases when:
  - crowding high
  - oxygen low
  - incompatible neighbors nearby
  - schooling species has too few same-species fish
- Energy decreases with activity; recovers during `hover/rest`.
- Health declines if high stress persists over many ticks.
- Fish behavior probabilities shift from calm to reactive as stress rises.

## 5) Behavior System

Each fish uses weighted behavior selection every N ticks (not every frame).

- `cruise`: default movement
- `school`: align with nearby same-species fish
- `hover`: low-speed drift, mild corrections
- `inspect`: move toward a waypoint/object anchor
- `rest`: minimal movement period
- `dart`: short burst response to disturbance
- `avoid`: steer away from aggressive/large nearby fish
- `chase`: only when temperament and conditions allow

State weighting inputs:

- species traits
- local neighbors (same species vs other species)
- tank pressures (crowding, oxygen, harmony)
- individual state (stress, energy, hunger)

## 6) "Add New Fish" Consequence Contract

When a new fish or species is added:

1. Recompute bioload and oxygen demand.
2. Recompute compatibility with all existing species.
3. Recompute schooling sufficiency for schooling species.
4. Recompute territory pressure.
5. Recompute behavior weights and stress trends.

Expected visible outcomes:

- crowding can reduce average speed and increase avoidance/darting
- incompatibility can increase spacing/chasing events
- undersized schools can increase stress and erratic motion
- overloaded tank lowers harmony, producing less calm swimming

## 7) Architecture for Implementation

Planned module layout:

- `lib/ecosystem/schema.ts` (types and validation)
- `lib/ecosystem/species.ts` (registry of species profiles)
- `lib/ecosystem/compatibility.ts` (species pair rules)
- `lib/ecosystem/simulator.ts` (pure step function; no Babylon imports)
- `lib/ecosystem/default-state.ts` (seed data for banner route)
- `components/three/fishtank/useEcosystem.ts` (client hook, tick scheduler)
- `lib/3d/babylon-adapter.ts` (render bridge only)

Key rule: Babylon layer reads simulation outputs but does not own ecology logic.

## 8) Performance Envelope

- Ecology tick: `4-8 Hz` (separate from render frame loop)
- Render frame: `requestAnimationFrame`
- Fish count target:
  - soft target: `8-24`
  - hard cap: `40` (auto quality downgrade after this)
- Neighbor checks:
  - start with O(n^2) under cap
  - upgrade to spatial buckets if count grows

## 9) Determinism and Debugging

- Use seeded PRNG for repeatable simulation sessions.
- Keep one "debug snapshot" JSON output for selected seeds.
- Add simple scenario tests:
  - community baseline
  - overstocked tank
  - incompatible pair injection
  - schooling deficit

## 10) Phase Plan

### Phase A: Ecological Backbone

- Species registry
- Tank pressure calculations
- Fish stress/energy/health updates
- Basic behavior switching

### Phase B: Visual Coupling

- Behavior-to-motion mapping in Babylon
- Calm vs stressed motion signatures
- Schooling cohesion visuals

### Phase C: Expandability

- Object anchors (`inspect` targets)
- Species-specific micro-behaviors
- Event timeline ("what changed after adding species X")

### Phase D: Authoring UX (optional)

- Local editor panel for adding fish/species and observing deltas live
- Persist presets as JSON snapshots

## 11) Definition of Done (for first implementation)

- Adding/removing a fish changes at least 3 measurable tank metrics.
- Fish behavior visibly changes from those metrics (not random-only).
- System runs at stable framerate on typical laptop/mobile hardware.
- Simulation logic is unit-testable without Babylon runtime.

## 12) Current Implementation Snapshot (2026-02-26)

- Added `lib/ecosystem/*` modules:
  - `schema.ts`
  - `species.ts`
  - `compatibility.ts`
  - `rng.ts`
  - `default-state.ts`
  - `simulator.ts`
  - `index.ts`
- Babylon fish visuals now spawn only from ecosystem fish entities (single source of truth).
- Default banner population set to 7 fish (half of prior 14) to reduce visual noise and runtime load.
- Added higher-fidelity procedural fish construction:
  - higher segment counts
  - rigged pivots for tails/fins
  - eye/iris meshes
  - shared 2k procedural scale texture
- Remaining gap to "true high-poly rigged assets":
  - requires authored GLB models + skinning/animation clips (outside current procedural mesh pipeline).
