export type SpeciesId = string;
export type FishId = string;

export type SizeClass = "small" | "medium" | "large";
export type PreferredDepth = "top" | "mid" | "bottom";
export type FishBehavior = "cruise" | "school" | "inspect" | "hover" | "dart" | "rest" | "avoid" | "chase";

export type SpeciesRenderProfile = {
  bodyRgb: [number, number, number];
  finRgb: [number, number, number];
  eyeRgb: [number, number, number];
};

export type SpeciesProfile = {
  id: SpeciesId;
  label: string;
  sizeClass: SizeClass;
  schooling: 0 | 1 | 2 | 3;
  temperament: 0 | 1 | 2 | 3;
  territoryNeed: number;
  activity: number;
  preferredDepth: PreferredDepth;
  bioload: number;
  oxygenUse: number;
  compatibilityTags: string[];
  render: SpeciesRenderProfile;
};

export type FishState = {
  id: FishId;
  speciesId: SpeciesId;
  ageDays: number;
  energy: number;
  stress: number;
  health: number;
  hunger: number;
  behavior: FishBehavior;
  decisionTimerSec: number;
  motionSeed: number;
  laneYNorm: number;
  laneZNorm: number;
  pathWidthNorm: number;
  pathDepthNorm: number;
  phase: number;
  speedFactor: number;
};

export type TankState = {
  timestampMs: number;
  waterQuality: number;
  oxygenLevel: number;
  crowding: number;
  aggressionPressure: number;
  harmony: number;
  bioload: number;
  incompatibility: number;
};

export type EcosystemState = {
  tick: number;
  rngState: number;
  tank: TankState;
  fish: FishState[];
};

export type TankConfig = {
  baseCapacity: number;
  oxygenCapacity: number;
  filtrationFactor: number;
  habitatFactor: number;
  targetPopulation: number;
};

export type CompatibilityLookup = Map<string, number>;

export type EcosystemStepInput = {
  state: EcosystemState;
  speciesIndex: Map<SpeciesId, SpeciesProfile>;
  compatibility: CompatibilityLookup;
  tankConfig: TankConfig;
  dtSec: number;
};

export const defaultTankConfig: TankConfig = {
  baseCapacity: 17,
  oxygenCapacity: 15,
  filtrationFactor: 1.1,
  habitatFactor: 0.85,
  targetPopulation: 16
};
