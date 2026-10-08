// Lakes, as in EvenHold's model/worldgen/lakes.ts: every connected basin of low ground floods or
// stays dry as a whole (water finds its level), and the spawn's basin always stays dry.
import { LAKE_NOISE_SCALE, MIN_LAKE_SIZE, WATER_LEVEL } from './constants';
import type { Noise2D } from './terrain';

export function generateLakeMap(heights: number[][], noise2D: Noise2D, threshold: number, spawn: number): boolean[][] {
  const size = heights.length;
  const lakes = heights.map((row) => row.map(() => false));
  const seen = new Uint8Array(size * size);
  for (let x = 0; x < size; x++) {
    for (let z = 0; z < size; z++) {
      if (heights[x][z] > WATER_LEVEL || seen[x * size + z]) continue;
      const basin: number[] = [];
      const stack = [x * size + z];
      seen[x * size + z] = 1;
      let hasSpawn = false;
      while (stack.length) {
        const cell = stack.pop()!;
        basin.push(cell);
        const cx = Math.floor(cell / size);
        const cz = cell % size;
        if (cx === spawn && cz === spawn) hasSpawn = true;
        for (const [nx, nz] of [[cx + 1, cz], [cx - 1, cz], [cx, cz + 1], [cx, cz - 1]]) {
          if (nx < 0 || nz < 0 || nx >= size || nz >= size) continue;
          const n = nx * size + nz;
          if (seen[n] || heights[nx][nz] > WATER_LEVEL) continue;
          seen[n] = 1;
          stack.push(n);
        }
      }
      if (basin.length < MIN_LAKE_SIZE || hasSpawn) continue;
      const blob = basin.reduce((a, c) => a + noise2D(Math.floor(c / size) / LAKE_NOISE_SCALE + 500, (c % size) / LAKE_NOISE_SCALE + 500), 0) / basin.length;
      if (blob > threshold) for (const c of basin) lakes[Math.floor(c / size)][c % size] = true;
    }
  }
  return lakes;
}
