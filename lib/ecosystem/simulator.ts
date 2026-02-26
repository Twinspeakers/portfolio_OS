import { getCompatibilityScore } from "@/lib/ecosystem/compatibility";
import { nextRandom } from "@/lib/ecosystem/rng";
import type {
  EcosystemState,
  EcosystemStepInput,
  FishBehavior,
  FishState,
  SpeciesId,
  SpeciesProfile
} from "@/lib/ecosystem/schema";

type TankMetrics = {
  bioload: number;
  oxygenDemand: number;
  crowding: number;
  aggressionPressure: number;
  incompatibility: number;
  harmony: number;
  waterQualityTarget: number;
  oxygenLevelTarget: number;
  speciesCounts: Map<SpeciesId, number>;
  speciesSocialPressure: Map<SpeciesId, number>;
};

const behaviorActivityFactor: Record<FishBehavior, number> = {
  cruise: 0.62,
  school: 0.66,
  inspect: 0.52,
  hover: 0.22,
  dart: 1.08,
  rest: 0.12,
  avoid: 0.88,
  chase: 1.02
};

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

function approach(current: number, target: number, maxDelta: number): number {
  if (current < target) return Math.min(target, current + maxDelta);
  return Math.max(target, current - maxDelta);
}

function weightForSchooling(species: SpeciesProfile, count: number): number {
  if (species.schooling === 0) return 0;
  const minimumGroup = species.schooling + 1;
  if (count >= minimumGroup) return 0;
  return clamp((minimumGroup - count) / minimumGroup);
}

function computeSpeciesCounts(fish: FishState[]): Map<SpeciesId, number> {
  const counts = new Map<SpeciesId, number>();
  for (const entry of fish) {
    counts.set(entry.speciesId, (counts.get(entry.speciesId) ?? 0) + 1);
  }
  return counts;
}

function computeIncompatibility(
  counts: Map<SpeciesId, number>,
  compatibility: EcosystemStepInput["compatibility"]
): number {
  const species = Array.from(counts.entries());
  let weightedHostility = 0;
  let weightedPairs = 0;

  for (let i = 0; i < species.length; i += 1) {
    const [a, countA] = species[i];
    for (let j = i; j < species.length; j += 1) {
      const [b, countB] = species[j];
      const pairWeight = i === j ? (countA * Math.max(0, countA - 1)) / 2 : countA * countB;
      if (pairWeight <= 0) continue;

      const score = getCompatibilityScore(compatibility, a, b);
      const hostility = clamp((0.58 - score) / 0.58);
      weightedHostility += hostility * pairWeight;
      weightedPairs += pairWeight;
    }
  }

  if (weightedPairs <= 0) return 0;
  return clamp(weightedHostility / weightedPairs);
}

function computeSpeciesSocialPressure(
  counts: Map<SpeciesId, number>,
  compatibility: EcosystemStepInput["compatibility"]
): Map<SpeciesId, number> {
  const entries = Array.from(counts.entries());
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  const pressureBySpecies = new Map<SpeciesId, number>();
  if (total <= 0) return pressureBySpecies;

  for (const [speciesId, count] of entries) {
    let pressure = 0;
    for (const [otherId, otherCount] of entries) {
      if (speciesId === otherId || otherCount <= 0) continue;
      const score = getCompatibilityScore(compatibility, speciesId, otherId);
      const hostility = clamp((0.62 - score) / 0.62);
      pressure += hostility * (otherCount / total);
    }
    pressureBySpecies.set(speciesId, clamp(pressure + (count / total) * 0.08));
  }

  return pressureBySpecies;
}

function computeTankMetrics(input: EcosystemStepInput): TankMetrics {
  const { state, speciesIndex, compatibility, tankConfig } = input;
  const speciesCounts = computeSpeciesCounts(state.fish);

  let bioload = 0;
  let oxygenDemand = 0;
  let temperamentSum = 0;
  let territorySum = 0;

  for (const fish of state.fish) {
    const species = speciesIndex.get(fish.speciesId);
    if (!species) continue;
    bioload += species.bioload;
    oxygenDemand += species.oxygenUse * (0.6 + species.activity * 0.5);
    temperamentSum += species.temperament / 3;
    territorySum += species.territoryNeed;
  }

  const fishCount = Math.max(1, state.fish.length);
  const effectiveCapacity = tankConfig.baseCapacity * tankConfig.filtrationFactor * (0.82 + tankConfig.habitatFactor * 0.28);
  const loadRatio = effectiveCapacity > 0 ? bioload / effectiveCapacity : 1;
  const populationRatio = state.fish.length / Math.max(1, tankConfig.targetPopulation);
  const incompatibility = computeIncompatibility(speciesCounts, compatibility);
  const speciesSocialPressure = computeSpeciesSocialPressure(speciesCounts, compatibility);

  const crowding = clamp((populationRatio - 0.68) * 1.06 + Math.max(0, loadRatio - 0.85) * 0.72);
  const aggressionPressure = clamp(
    temperamentSum / fishCount * 0.42 +
      incompatibility * 0.35 +
      territorySum / fishCount * crowding * 0.74
  );

  const oxygenRatio = oxygenDemand / Math.max(0.001, tankConfig.oxygenCapacity * tankConfig.filtrationFactor);
  const oxygenLevelTarget = clamp(1 - Math.max(0, oxygenRatio - 0.66) / 0.8);
  const waterQualityTarget = clamp(1 - Math.max(0, loadRatio - 0.55) * 0.64 - crowding * 0.24 - incompatibility * 0.18);
  const harmony = clamp(1 - (crowding * 0.32 + aggressionPressure * 0.34 + incompatibility * 0.34));

  return {
    bioload,
    oxygenDemand,
    crowding,
    aggressionPressure,
    incompatibility,
    harmony,
    waterQualityTarget,
    oxygenLevelTarget,
    speciesCounts,
    speciesSocialPressure
  };
}

function weightedBehaviorChoice(
  randomValue: number,
  behaviorWeights: Record<FishBehavior, number>
): FishBehavior {
  const entries = Object.entries(behaviorWeights) as [FishBehavior, number][];
  let total = 0;
  for (const [, weight] of entries) {
    total += Math.max(0, weight);
  }

  if (total <= 0) return "cruise";
  let cursor = randomValue * total;

  for (const [behavior, weight] of entries) {
    cursor -= Math.max(0, weight);
    if (cursor <= 0) return behavior;
  }

  return "cruise";
}

function behaviorWeightsForFish(
  fish: FishState,
  species: SpeciesProfile,
  metrics: TankMetrics,
  sameSpeciesCount: number
): Record<FishBehavior, number> {
  const schoolingPenalty = weightForSchooling(species, sameSpeciesCount);
  const stress = fish.stress;
  const lowEnergy = clamp(1 - fish.energy);

  return {
    cruise: 1.2 + species.activity * 0.9 - stress * 0.4,
    school: species.schooling > 0 && sameSpeciesCount > 1 ? 0.8 + species.schooling * 0.26 : 0.01,
    inspect: 0.24 + fish.hunger * 0.66 + (1 - metrics.harmony) * 0.2,
    hover: 0.2 + lowEnergy * 0.8 + (1 - metrics.oxygenLevelTarget) * 0.25,
    dart: 0.05 + stress * 1.2 + metrics.crowding * 0.4,
    rest: 0.03 + lowEnergy * 1.1 + (1 - fish.health) * 0.45,
    avoid: 0.08 + metrics.speciesSocialPressure.get(fish.speciesId)! * 0.94 + metrics.incompatibility * 0.4,
    chase: species.temperament >= 2 ? 0.04 + metrics.aggressionPressure * 0.82 + fish.energy * 0.2 + schoolingPenalty * 0.22 : 0.01
  };
}

export function stepEcosystem(input: EcosystemStepInput): EcosystemState {
  const { state, speciesIndex, dtSec } = input;
  if (dtSec < 0) return state;

  const metrics = computeTankMetrics(input);
  let rngState = state.rngState;

  const waterQuality = approach(
    state.tank.waterQuality,
    metrics.waterQualityTarget,
    dtSec * (metrics.waterQualityTarget < state.tank.waterQuality ? 0.3 : 0.12)
  );

  const oxygenLevel = approach(
    state.tank.oxygenLevel,
    metrics.oxygenLevelTarget,
    dtSec * (metrics.oxygenLevelTarget < state.tank.oxygenLevel ? 0.34 : 0.16)
  );

  const fish = state.fish.map((entry) => {
    const species = speciesIndex.get(entry.speciesId);
    if (!species) return entry;

    const sameSpeciesCount = metrics.speciesCounts.get(entry.speciesId) ?? 1;
    const schoolingPenalty = weightForSchooling(species, sameSpeciesCount);
    const socialPressure = metrics.speciesSocialPressure.get(entry.speciesId) ?? 0;
    const stressTarget = clamp(
      0.08 +
        metrics.crowding * 0.28 +
        (1 - oxygenLevel) * 0.3 +
        (1 - waterQuality) * 0.22 +
        socialPressure * 0.34 +
        metrics.aggressionPressure * (0.16 + species.temperament * 0.08) +
        schoolingPenalty * 0.28
    );
    const stress = approach(entry.stress, stressTarget, dtSec * (stressTarget > entry.stress ? 0.48 : 0.26));

    let decisionTimerSec = Math.max(0, entry.decisionTimerSec - dtSec);
    let behavior = entry.behavior;

    if (decisionTimerSec <= 0 || dtSec === 0) {
      const [choiceRandom, nextSeed] = nextRandom(rngState);
      rngState = nextSeed;
      behavior = weightedBehaviorChoice(choiceRandom, behaviorWeightsForFish(entry, species, metrics, sameSpeciesCount));

      const [timerRandom, timerSeed] = nextRandom(rngState);
      rngState = timerSeed;
      decisionTimerSec =
        0.9 + timerRandom * 2.4 + (behavior === "rest" ? 1.2 : 0) + (behavior === "hover" ? 0.5 : 0);
    }

    const activityFactor = behaviorActivityFactor[behavior] * (0.52 + species.activity * 0.68);
    const recovery = behavior === "rest" ? 0.3 : behavior === "hover" ? 0.15 : 0.02;
    const energy = clamp(entry.energy + (recovery - activityFactor * 0.1 - stress * 0.05) * dtSec);
    const hunger = clamp(entry.hunger + (0.028 + activityFactor * 0.026) * dtSec);

    const healthTarget = clamp(
      1 -
        (stress * 0.52 +
          (1 - waterQuality) * 0.28 +
          (1 - oxygenLevel) * 0.24 +
          metrics.crowding * 0.16)
    );
    const health = approach(
      entry.health,
      healthTarget,
      dtSec * (healthTarget < entry.health ? 0.1 : 0.035)
    );

    return {
      ...entry,
      ageDays: entry.ageDays + dtSec / 86400,
      stress,
      energy,
      hunger,
      health,
      behavior,
      decisionTimerSec
    };
  });

  return {
    tick: state.tick + (dtSec > 0 ? 1 : 0),
    rngState,
    fish,
    tank: {
      ...state.tank,
      timestampMs: Date.now(),
      waterQuality,
      oxygenLevel,
      crowding: metrics.crowding,
      aggressionPressure: metrics.aggressionPressure,
      harmony: metrics.harmony,
      bioload: metrics.bioload,
      incompatibility: metrics.incompatibility
    }
  };
}
