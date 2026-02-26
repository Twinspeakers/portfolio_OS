export function nextRandom(seed: number): [number, number] {
  let next = seed | 0;
  next = (next + 0x6d2b79f5) | 0;
  let value = Math.imul(next ^ (next >>> 15), 1 | next);
  value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
  const normalized = ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  return [normalized, next >>> 0];
}

export function nextRange(seed: number, min: number, max: number): [number, number] {
  const [normalized, next] = nextRandom(seed);
  return [min + (max - min) * normalized, next];
}

export function nextInt(seed: number, minInclusive: number, maxExclusive: number): [number, number] {
  const [normalized, next] = nextRandom(seed);
  const value = minInclusive + Math.floor(normalized * Math.max(1, maxExclusive - minInclusive));
  return [value, next];
}
