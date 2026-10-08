// World generation entry point. Order matters: every step draws from the same rng stream.
import { createNoise2D } from 'simplex-noise';
import { LAKE_THRESHOLD_MAX, LAKE_THRESHOLD_MIN, MAP_SIZE, SPAWN_CLEARING, TREE_CHANCE, TREE_SHAPES } from './constants';
import { generateLakeMap } from './lakes';
import { mulberry32 } from './random';
import { generateHeightMap, smoothHeightMap } from './terrain';

export type Tree = { x: number; z: number; shape: number };

export type World = {
  seed: number;
  size: number;
  spawn: { x: number; z: number };
  heights: number[][];
  lakes: boolean[][];
  trees: Tree[];
};

export function generateWorld(seed: number, size = MAP_SIZE): World {
  const rng = mulberry32(seed);
  const noise2D = createNoise2D(rng);
  const spawn = Math.floor(size / 2);
  const threshold = LAKE_THRESHOLD_MIN + rng() * (LAKE_THRESHOLD_MAX - LAKE_THRESHOLD_MIN);
  const heights = generateHeightMap(noise2D, size);
  smoothHeightMap(heights);
  const lakes = generateLakeMap(heights, noise2D, threshold, spawn);

  // Forests: a slow density field decides where woods are thick, thin or absent.
  const forest = createNoise2D(mulberry32(seed ^ 0x5eed));
  const trees: Tree[] = [];
  for (let x = 1; x < size - 1; x++) {
    for (let z = 1; z < size - 1; z++) {
      const roll = rng();
      if (lakes[x][z] || Math.max(Math.abs(x - spawn), Math.abs(z - spawn)) <= SPAWN_CLEARING) continue;
      const density = (forest(x / 18, z / 18) + 1) / 2; // 0..1
      const chance = TREE_CHANCE * 0.25 + Math.max(0, density - 0.45) * 1.1;
      if (roll < chance) trees.push({ x: x + (rng() - 0.5) * 0.3, z: z + (rng() - 0.5) * 0.3, shape: Math.floor(rng() * TREE_SHAPES) });
    }
  }
  return { seed, size, spawn: { x: spawn, z: spawn }, heights, lakes, trees };
}

export const inBounds = (w: World, x: number, z: number) => x >= 0 && z >= 0 && x < w.size && z < w.size;
export const tierAt = (w: World, x: number, z: number) => (inBounds(w, x, z) ? w.heights[x][z] : 0);
export const isLake = (w: World, x: number, z: number) => inBounds(w, x, z) && w.lakes[x][z];
