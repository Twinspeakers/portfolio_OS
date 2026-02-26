import type { CompatibilityLookup, SpeciesId } from "@/lib/ecosystem/schema";

export type CompatibilityRule = {
  a: SpeciesId;
  b: SpeciesId;
  score: number;
};

export const defaultCompatibilityRules: CompatibilityRule[] = [
  { a: "neon_tetra", b: "guppy", score: 0.76 },
  { a: "neon_tetra", b: "corydoras", score: 0.9 },
  { a: "neon_tetra", b: "dwarf_gourami", score: 0.44 },
  { a: "neon_tetra", b: "cherry_barb", score: 0.68 },
  { a: "guppy", b: "corydoras", score: 0.82 },
  { a: "guppy", b: "dwarf_gourami", score: 0.36 },
  { a: "guppy", b: "cherry_barb", score: 0.54 },
  { a: "corydoras", b: "dwarf_gourami", score: 0.56 },
  { a: "corydoras", b: "cherry_barb", score: 0.72 },
  { a: "dwarf_gourami", b: "cherry_barb", score: 0.34 }
];

function buildKey(a: SpeciesId, b: SpeciesId): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function buildCompatibilityLookup(rules: CompatibilityRule[]): CompatibilityLookup {
  const lookup: CompatibilityLookup = new Map();
  for (const rule of rules) {
    lookup.set(buildKey(rule.a, rule.b), rule.score);
  }
  return lookup;
}

export function getCompatibilityScore(lookup: CompatibilityLookup, a: SpeciesId, b: SpeciesId): number {
  if (a === b) return 1;
  const key = buildKey(a, b);
  return lookup.get(key) ?? 0.5;
}
