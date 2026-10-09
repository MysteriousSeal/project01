export type Rng = () => number;

// mulberry32: small, fast, and fully determined by its 32-bit seed, so the same seed always
// rebuilds the same puzzle on every device.
export function makeRng(seed: number): Rng {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Spreads nearby integers (level 1, 2, 3… or consecutive dates) across the 32-bit space with
// integer-only math, so seeds never lose precision the way a large float multiply would.
export function hashSeed(n: number): number {
  let h = Math.imul(n | 0, 0x9e3779b1);
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  return h | 0;
}

export function randomInt(rng: Rng, maxExclusive: number): number {
  return Math.floor(rng() * maxExclusive);
}
