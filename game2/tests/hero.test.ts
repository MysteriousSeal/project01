import { describe, expect, it } from '@jest/globals';
import { TILE_HEIGHT } from '../src/eh/model/constants';
import { GameModel } from '../src/eh/model/GameModel';
import type { World } from '../src/eh/model/types';
import { generateWorld } from '../src/eh/model/worldgen/world';
import { blocked, createHero, groundY, HERO_SPEED, indexBlockers, inputToWorld, type Land, stepHero } from '../src/sim/hero';

const SIZE = { width: 12, depth: 12 };
const flatWorld = (tier = 2): World => ({
  size: SIZE,
  heightMap: Array.from({ length: 12 }, () => Array(12).fill(tier)),
  lakeMap: Array.from({ length: 12 }, () => Array(12).fill(false)),
  surfaceMap: Array.from({ length: 12 }, () => Array(12).fill('natural')),
  trees: [],
  bushes: [],
});
const land = (w: World): Land => new GameModel(1, w.size, w);

const walk = (l: Land, input: { x: number; y: number }, seconds: number) => {
  const blockers = indexBlockers(l);
  let h = createHero(l);
  for (let t = 0; t < seconds; t += 1 / 60) h = stepHero(h, l, blockers, input, 1 / 60);
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
    const l = land(flatWorld());
    const h = walk(l, { x: 1, y: 0 }, 1);
    expect(Math.hypot(h.x - 6, h.z - 6)).toBeCloseTo(HERO_SPEED, 0);
    expect(walk(l, { x: 0, y: 0 }, 1)).toMatchObject({ x: 6, z: 6, moving: false });
  });

  it('is stopped by water, trunks, bushes and the edge of the map', () => {
    const wet = flatWorld();
    wet.lakeMap[8][6] = true;
    expect(walk(land(wet), { x: 1, y: 1 }, 3).x).toBeLessThan(7.5); // (+x: right and down on screen)
    const wooded = flatWorld();
    wooded.trees.push({ x: 8, z: 6, groundTier: 2, kind: 'oak', shape: 0, quarterTurns: 0 });
    wooded.bushes.push({ x: 6, z: 9, groundTier: 2, kind: 'leafy', shape: 0, quarterTurns: 0 });
    const l = land(wooded);
    const blockers = indexBlockers(l);
    expect(blocked(l, blockers, 8, 6)).toBe(true);
    expect(blocked(l, blockers, 8.4, 6)).toBe(false); // (only the trunk blocks, not the canopy)
    expect(blocked(l, blockers, 6, 9.25)).toBe(true);
    expect(blocked(l, blockers, 6, 6)).toBe(false);
    expect(walk(land(flatWorld()), { x: -1, y: -1 }, 10).x).toBeGreaterThan(-0.5);
  });

  it('hops up a tier and lands on it', () => {
    const w = flatWorld();
    for (let z = 0; z < 12; z++) for (let x = 8; x < 12; x++) w.heightMap[x][z] = 3;
    const l = land(w);
    const blockers = indexBlockers(l);
    let h = createHero(l);
    let peak = 0;
    for (let i = 0; i < 120; i++) {
      h = stepHero(h, l, blockers, { x: 1, y: 1 }, 1 / 60);
      peak = Math.max(peak, h.y);
    }
    expect(h.x).toBeGreaterThan(8);
    expect(h.y).toBeCloseTo(3 * TILE_HEIGHT);
    expect(peak).toBeGreaterThan(3 * TILE_HEIGHT);
  });
});

describe("EvenHold's countryside", () => {
  const size = { width: 128, depth: 128 };

  it('is the same for a seed, and starts the hero on dry land they can walk from', () => {
    expect(generateWorld(42, size)).toEqual(generateWorld(42, size));
    for (const seed of [1, 2, 3, 77]) {
      const w = generateWorld(seed, size);
      const l = land(w);
      expect(w.lakeMap[64][64]).toBe(false);
      expect(w.trees.length).toBeGreaterThan(100);
      expect(new Set(w.trees.map((t) => t.kind)).size).toBeGreaterThan(1);
      const h = walk(l, { x: 0.3, y: -1 }, 2);
      expect(Math.hypot(h.x - 64, h.z - 64)).toBeGreaterThan(1);
      expect(h.y).toBeCloseTo(groundY(l, h.x, h.z), 1);
    }
  });
});
