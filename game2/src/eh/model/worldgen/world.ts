// EvenHold's world generation (model/worldgen/world.ts) for countryside alone: the same steps in
// the same order on the same rng stream for the land, lakes, trees and bushes. Villages, roads,
// fields, ruins and camps are left out until they're ported.
import { createNoise2D } from 'simplex-noise';
import { mulberry32 } from '../../util/random';
import { LAKE_THRESHOLD_MAX, LAKE_THRESHOLD_MIN } from '../constants';
import { spawnOf, type MapSize } from '../map/grid';
import type { Surface, World } from '../types';
import { generateBushes } from './bushes';
import { generateLakeMap } from './lakes';
import { createMeadowDensity } from './meadows';
import { generateHeightMap, smoothHeightMap } from './terrain';
import { createForestDensity, generateTrees } from './trees';

export function generateWorld(seed: number, size: MapSize): World {
  const spawn = spawnOf(size);
  const rng = mulberry32(seed);
  const noise2D = createNoise2D(rng);
  const lakeThreshold = LAKE_THRESHOLD_MIN + rng() * (LAKE_THRESHOLD_MAX - LAKE_THRESHOLD_MIN);
  const heightMap = generateHeightMap(noise2D, size);
  smoothHeightMap(heightMap);
  const lakeMap = generateLakeMap(heightMap, noise2D, lakeThreshold, spawn.x, spawn.z);
  const surfaceMap: Surface[][] = heightMap.map((row) => row.map((): Surface => 'natural'));
  const solid = new Set<string>();
  const trees = generateTrees(heightMap, lakeMap, surfaceMap, solid, rng, createForestDensity(seed), spawn.x, spawn.z);
  const bushes = generateBushes(heightMap, lakeMap, surfaceMap, solid, trees, createMeadowDensity(seed), spawn.x, spawn.z);
  return { size, heightMap, lakeMap, surfaceMap, trees, bushes };
}
