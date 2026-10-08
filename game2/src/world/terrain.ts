// Base terrain heights, as in EvenHold's model/worldgen/terrain.ts.
import { MAX_TIER, NOISE_SCALE } from './constants';

export type Noise2D = (x: number, y: number) => number;

export function generateHeightMap(noise2D: Noise2D, size: number): number[][] {
  const map: number[][] = [];
  for (let x = 0; x < size; x++) {
    const row: number[] = [];
    for (let z = 0; z < size; z++) {
      const base = noise2D(x / NOISE_SCALE, z / NOISE_SCALE);
      const detail = noise2D(x / (NOISE_SCALE / 3), z / (NOISE_SCALE / 3)) * 0.3;
      const normalized = Math.min(1, Math.max(0, (base + detail + 1.3) / 2.6));
      row.push(Math.min(MAX_TIER, Math.floor(normalized * (MAX_TIER + 1))));
    }
    map.push(row);
  }
  return map;
}

/**
 * Caps the height difference between orthogonal neighbors at one tier, in place, so every step is
 * walkable. Sweeps alternate direction so corrections spread both ways (Gauss-Seidel style).
 */
export function smoothHeightMap(map: number[][]): void {
  const size = map.length;
  for (let iteration = 0; iteration < 16; iteration++) {
    let changed = false;
    const reverse = iteration % 2 === 1;
    for (let xi = 0; xi < size; xi++) {
      const x = reverse ? size - 1 - xi : xi;
      for (let zi = 0; zi < size; zi++) {
        const z = reverse ? size - 1 - zi : zi;
        let lo = Infinity;
        let hi = -Infinity;
        for (const [nx, nz] of [[x + 1, z], [x - 1, z], [x, z + 1], [x, z - 1]]) {
          if (nx < 0 || nz < 0 || nx >= size || nz >= size) continue;
          const nh = map[nx][nz];
          if (nh < lo) lo = nh;
          if (nh > hi) hi = nh;
        }
        const h = map[x][z];
        const next = hi - 1 <= lo + 1 ? Math.min(lo + 1, Math.max(hi - 1, h)) : Math.round((lo + hi) / 2);
        if (next !== h) {
          map[x][z] = next;
          changed = true;
        }
      }
    }
    if (!changed) break;
  }
}
