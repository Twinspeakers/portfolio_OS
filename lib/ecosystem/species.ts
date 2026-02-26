import type { SpeciesProfile, SpeciesId } from "@/lib/ecosystem/schema";

export const defaultSpeciesCatalog: SpeciesProfile[] = [
  {
    id: "neon_tetra",
    label: "Neon Tetra",
    sizeClass: "small",
    schooling: 3,
    temperament: 0,
    territoryNeed: 0.12,
    activity: 0.78,
    preferredDepth: "mid",
    bioload: 0.72,
    oxygenUse: 0.58,
    compatibilityTags: ["community", "schooling"],
    render: {
      bodyRgb: [0.2, 0.87, 1],
      finRgb: [0.95, 0.38, 0.3],
      eyeRgb: [0.08, 0.12, 0.15]
    }
  },
  {
    id: "guppy",
    label: "Guppy",
    sizeClass: "small",
    schooling: 1,
    temperament: 0,
    territoryNeed: 0.18,
    activity: 0.74,
    preferredDepth: "top",
    bioload: 0.8,
    oxygenUse: 0.62,
    compatibilityTags: ["community", "livebearer"],
    render: {
      bodyRgb: [1, 0.58, 0.24],
      finRgb: [1, 0.77, 0.3],
      eyeRgb: [0.1, 0.08, 0.08]
    }
  },
  {
    id: "corydoras",
    label: "Corydoras",
    sizeClass: "small",
    schooling: 2,
    temperament: 0,
    territoryNeed: 0.14,
    activity: 0.46,
    preferredDepth: "bottom",
    bioload: 0.84,
    oxygenUse: 0.6,
    compatibilityTags: ["community", "bottom-dweller"],
    render: {
      bodyRgb: [0.65, 0.74, 0.84],
      finRgb: [0.44, 0.56, 0.66],
      eyeRgb: [0.1, 0.1, 0.12]
    }
  },
  {
    id: "dwarf_gourami",
    label: "Dwarf Gourami",
    sizeClass: "medium",
    schooling: 0,
    temperament: 2,
    territoryNeed: 0.56,
    activity: 0.56,
    preferredDepth: "mid",
    bioload: 1.34,
    oxygenUse: 0.92,
    compatibilityTags: ["territorial"],
    render: {
      bodyRgb: [0.56, 0.74, 1],
      finRgb: [0.84, 0.92, 1],
      eyeRgb: [0.08, 0.1, 0.14]
    }
  },
  {
    id: "cherry_barb",
    label: "Cherry Barb",
    sizeClass: "small",
    schooling: 2,
    temperament: 1,
    territoryNeed: 0.24,
    activity: 0.7,
    preferredDepth: "mid",
    bioload: 0.86,
    oxygenUse: 0.68,
    compatibilityTags: ["community", "schooling"],
    render: {
      bodyRgb: [0.96, 0.3, 0.44],
      finRgb: [1, 0.58, 0.34],
      eyeRgb: [0.12, 0.08, 0.08]
    }
  }
];

export function createSpeciesIndex(catalog: SpeciesProfile[]): Map<SpeciesId, SpeciesProfile> {
  return new Map(catalog.map((species) => [species.id, species]));
}
