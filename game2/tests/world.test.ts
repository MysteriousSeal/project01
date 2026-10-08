import { describe, expect, it } from '@jest/globals';
import { MAX_TIER, SPAWN_CLEARING } from '../src/world/constants';
import { generateWorld } from '../src/world/world';

describe('world generation', () => {
  it('is the same for the same seed and differs between seeds', () => {
    expect(generateWorld(42)).toEqual(generateWorld(42));
    expect(generateWorld(42).heights).not.toEqual(generateWorld(43).heights);
  });

  it('keeps every step between neighbors to one tier, within range', () => {
    for (const seed of [1, 2, 3, 99]) {
      const w = generateWorld(seed);
      for (let x = 0; x < w.size; x++)
        for (let z = 0; z < w.size; z++) {
          const h = w.heights[x][z];
          expect(h).toBeGreaterThanOrEqual(0);
          expect(h).toBeLessThanOrEqual(MAX_TIER);
          if (x + 1 < w.size) expect(Math.abs(h - w.heights[x + 1][z])).toBeLessThanOrEqual(1);
          if (z + 1 < w.size) expect(Math.abs(h - w.heights[x][z + 1])).toBeLessThanOrEqual(1);
        }
    }
  });

  it('starts the hero on dry land in a clearing', () => {
    for (const seed of [1, 7, 1234, 98765]) {
      const w = generateWorld(seed);
      expect(w.lakes[w.spawn.x][w.spawn.z]).toBe(false);
      for (const t of w.trees) expect(Math.max(Math.abs(t.x - w.spawn.x), Math.abs(t.z - w.spawn.z))).toBeGreaterThan(SPAWN_CLEARING - 0.5);
    }
  });

  it('grows trees on dry land only, and has some woods and water across seeds', () => {
    let lakes = 0;
    for (const seed of [1, 2, 3, 4, 5]) {
      const w = generateWorld(seed);
      for (const t of w.trees) expect(w.lakes[Math.round(t.x)][Math.round(t.z)]).toBe(false);
      expect(w.trees.length).toBeGreaterThan(50);
      lakes += w.lakes.flat().filter(Boolean).length;
    }
    expect(lakes).toBeGreaterThan(0);
  });
});
