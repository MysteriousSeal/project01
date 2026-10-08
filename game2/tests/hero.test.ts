import { describe, expect, it } from '@jest/globals';
import { blocked, createHero, groundY, HERO_SPEED, indexTrees, inputToWorld, stepHero } from '../src/sim/hero';
import { TILE_HEIGHT } from '../src/world/constants';
import { generateWorld, type World } from '../src/world/world';

const flat = (size = 12, tier = 2): World => ({
  seed: 0, size, spawn: { x: 6, z: 6 },
  heights: Array.from({ length: size }, () => Array(size).fill(tier)),
  lakes: Array.from({ length: size }, () => Array(size).fill(false)),
  trees: [],
});

const walk = (w: World, input: { x: number; y: number }, seconds: number) => {
  const trees = indexTrees(w);
  let h = createHero(w);
  for (let t = 0; t < seconds; t += 1 / 60) h = stepHero(h, w, trees, input, 1 / 60);
  return h;
};

describe('hero movement', () => {
  it('maps the stick to the isometric diagonals', () => {
    const up = inputToWorld({ x: 0, y: -1 });
    expect(up.dx).toBeCloseTo(-Math.SQRT1_2);
    expect(up.dz).toBeCloseTo(-Math.SQRT1_2);
    const right = inputToWorld({ x: 1, y: 0 });
    expect(right.dx).toBeCloseTo(Math.SQRT1_2);
    expect(right.dz).toBeCloseTo(-Math.SQRT1_2);
  });

  it('walks at the hero speed and stands still without input', () => {
    const w = flat();
    const h = walk(w, { x: 1, y: 0 }, 1);
    expect(Math.hypot(h.x - 6, h.z - 6)).toBeCloseTo(HERO_SPEED, 0);
    expect(walk(w, { x: 0, y: 0 }, 1)).toMatchObject({ x: 6, z: 6, moving: false });
  });

  it('is stopped by water, trees and the edge of the map', () => {
    const w = flat();
    w.lakes[8][6] = true;
    expect(walk(w, { x: 1, y: 1 }, 3).x).toBeLessThan(7.5); // (+x: right and down on screen)
    const wooded = flat();
    wooded.trees.push({ x: 8, z: 6, shape: 0 });
    const trees = indexTrees(wooded);
    expect(blocked(wooded, trees, 8, 6)).toBe(true);
    expect(blocked(wooded, trees, 6, 6)).toBe(false);
    const edge = walk(flat(), { x: -1, y: -1 }, 10);
    expect(edge.x).toBeGreaterThan(-0.5);
  });

  it('hops up a tier and lands on it', () => {
    const w = flat();
    for (let z = 0; z < 12; z++) for (let x = 8; x < 12; x++) w.heights[x][z] = 3;
    const trees = indexTrees(w);
    let h = createHero(w);
    let peak = 0;
    for (let i = 0; i < 120; i++) {
      h = stepHero(h, w, trees, { x: 1, y: 1 }, 1 / 60);
      peak = Math.max(peak, h.y);
    }
    expect(h.x).toBeGreaterThan(8);
    expect(h.y).toBeCloseTo(3 * TILE_HEIGHT);
    expect(peak).toBeGreaterThan(3 * TILE_HEIGHT);
  });

  it('can walk away from the spawn on real worlds', () => {
    for (const seed of [1, 2, 3]) {
      const w = generateWorld(seed);
      const h = walk(w, { x: 0.3, y: -1 }, 2);
      expect(Math.hypot(h.x - w.spawn.x, h.z - w.spawn.z)).toBeGreaterThan(1);
      expect(h.y).toBeCloseTo(groundY(w, h.x, h.z), 1);
    }
  });
});
