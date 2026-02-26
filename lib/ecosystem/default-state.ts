import type { EcosystemState, FishBehavior, FishState, PreferredDepth, SpeciesId } from "@/lib/ecosystem/schema";
import { nextRange } from "@/lib/ecosystem/rng";

type PopulationGroup = {
  speciesId: SpeciesId;
  count: number;
};

const defaultPopulation: PopulationGroup[] = [
  { speciesId: "neon_tetra", count: 3 },
  { speciesId: "guppy", count: 2 },
  { speciesId: "corydoras", count: 1 },
  { speciesId: "dwarf_gourami", count: 1 }
];

const initialBehavior: FishBehavior = "cruise";

function depthRange(preferredDepth: PreferredDepth): [number, number] {
  if (preferredDepth === "top") return [0.22, 0.92];
  if (preferredDepth === "bottom") return [-0.95, -0.22];
  return [-0.38, 0.46];
}

function createFishState(index: number, speciesId: SpeciesId, preferredDepth: PreferredDepth, seed: number): [FishState, number] {
  let next = seed;

  const [energy, seed1] = nextRange(next, 0.65, 0.92);
  next = seed1;
  const [stress, seed2] = nextRange(next, 0.08, 0.26);
  next = seed2;
  const [health, seed3] = nextRange(next, 0.8, 0.97);
  next = seed3;
  const [hunger, seed4] = nextRange(next, 0.08, 0.35);
  next = seed4;
  const [timer, seed5] = nextRange(next, 0.9, 2.6);
  next = seed5;

  const [laneYMin, laneYMax] = depthRange(preferredDepth);
  const [laneYNorm, seed6] = nextRange(next, laneYMin, laneYMax);
  next = seed6;
  const [laneZNorm, seed7] = nextRange(next, -0.85, 0.85);
  next = seed7;
  const [pathWidthNorm, seed8] = nextRange(next, 0.42, 0.82);
  next = seed8;
  const [pathDepthNorm, seed9] = nextRange(next, 0.22, 0.5);
  next = seed9;
  const [phase, seed10] = nextRange(next, 0, Math.PI * 2);
  next = seed10;
  const [speedFactor, seed11] = nextRange(next, 0.68, 1.12);
  next = seed11;

  return [
    {
      id: `fish-${index + 1}`,
      speciesId,
      ageDays: 45 + index * 2.6,
      energy,
      stress,
      health,
      hunger,
      behavior: initialBehavior,
      decisionTimerSec: timer,
      motionSeed: next,
      laneYNorm,
      laneZNorm,
      pathWidthNorm,
      pathDepthNorm,
      phase,
      speedFactor
    },
    next
  ];
}

export function createDefaultEcosystemState(seed = 82064021): EcosystemState {
  let next = seed >>> 0;
  let fishIndex = 0;
  const fish: FishState[] = [];

  const depthBySpecies: Record<SpeciesId, PreferredDepth> = {
    neon_tetra: "mid",
    guppy: "top",
    corydoras: "bottom",
    dwarf_gourami: "mid",
    cherry_barb: "mid"
  };

  for (const group of defaultPopulation) {
    const preferredDepth = depthBySpecies[group.speciesId] ?? "mid";
    for (let i = 0; i < group.count; i += 1) {
      const [entry, updatedSeed] = createFishState(fishIndex, group.speciesId, preferredDepth, next);
      fish.push(entry);
      next = updatedSeed;
      fishIndex += 1;
    }
  }

  return {
    tick: 0,
    rngState: next,
    fish,
    tank: {
      timestampMs: Date.now(),
      waterQuality: 0.9,
      oxygenLevel: 0.9,
      crowding: 0.18,
      aggressionPressure: 0.14,
      harmony: 0.84,
      bioload: 0,
      incompatibility: 0
    }
  };
}
