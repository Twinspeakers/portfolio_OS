export { createDefaultEcosystemState } from "@/lib/ecosystem/default-state";
export { buildCompatibilityLookup, defaultCompatibilityRules } from "@/lib/ecosystem/compatibility";
export { createSpeciesIndex, defaultSpeciesCatalog } from "@/lib/ecosystem/species";
export { stepEcosystem } from "@/lib/ecosystem/simulator";
export { defaultTankConfig } from "@/lib/ecosystem/schema";
export type {
  CompatibilityLookup,
  EcosystemState,
  FishBehavior,
  FishId,
  FishState,
  SpeciesId,
  SpeciesProfile,
  TankConfig,
  TankState
} from "@/lib/ecosystem/schema";
