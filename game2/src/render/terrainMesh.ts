// The land and the lakes, each a single mesh. Tiles are centred on whole numbers.
import * as THREE from 'three';
import { CHUNK, TILE_HEIGHT, WATER_LEVEL } from '../world/constants';
import { hash2 } from '../world/random';
import { inBounds, isLake, tierAt, type World } from '../world/world';
import { TERRAIN, WATER } from './palette';
import { QuadBuilder, vertexColored } from './voxels';

const GRAIN = 3; // a tile top is split into GRAIN x GRAIN voxel cells, each its own shade
export const WATER_DROP = 0.06; // how far the water surface sits below the bank
export const waterY = () => WATER_LEVEL * TILE_HEIGHT - WATER_DROP;
const BED = -TILE_HEIGHT; // the bottom of the map's outer walls

const shadeColor = (hex: number, k: number) => new THREE.Color(hex).multiplyScalar(k).getHex();

/** Grass shade for one voxel cell: slow meadow patches, small clumps and single-voxel grain. */
function grass(tier: number, cx: number, cz: number) {
  const meadow = hash2(Math.floor(cx / 7), Math.floor(cz / 7), 1) * 0.6 + hash2(Math.floor(cx / 3), Math.floor(cz / 3), 2) * 0.4;
  let k = 0.92 + meadow * 0.14;
  const clump = hash2(Math.floor(cx / 2), Math.floor(cz / 2), 3);
  if (clump > 0.9) k *= 0.88;
  else if (clump < 0.05) k *= 1.07;
  k *= 0.97 + hash2(cx, cz, 4) * 0.06;
  return shadeColor(TERRAIN[tier], k);
}

/** Water color by how far a lake tile is from its shore. */
function waterColor(w: World, x: number, z: number) {
  let d = 0;
  for (let r = 1; r <= 4 && d === 0; r++) {
    for (let i = -r; i <= r && d === 0; i++)
      for (let j = -r; j <= r; j++) if (inBounds(w, x + i, z + j) && !isLake(w, x + i, z + j)) d = r;
  }
  const ramp = [WATER.shallow, WATER.shallow, WATER.mid, WATER.deep, WATER.deepest];
  return ramp[d === 0 ? 4 : Math.min(4, d)];
}

/** Land and water, one pair of meshes per chunk so the camera only draws what it sees. */
export function buildTerrain(w: World): THREE.Group {
  const group = new THREE.Group();
  const material = vertexColored();
  for (let cx = 0; cx < w.size; cx += CHUNK)
    for (let cz = 0; cz < w.size; cz += CHUNK) {
      const { land, water } = buildChunk(w, cx, cz);
      for (const q of [land, water]) if (q.positions.length) group.add(new THREE.Mesh(q.geometry(), material));
    }
  return group;
}

function buildChunk(w: World, cx: number, cz: number) {
  const land = new QuadBuilder();
  const water = new QuadBuilder();
  const surface = (x: number, z: number) => (isLake(w, x, z) ? waterY() : tierAt(w, x, z) * TILE_HEIGHT);
  for (let x = cx; x < Math.min(w.size, cx + CHUNK); x++) {
    for (let z = cz; z < Math.min(w.size, cz + CHUNK); z++) {
      const lake = isLake(w, x, z);
      const y = surface(x, z);
      const tier = tierAt(w, x, z);
      if (lake) {
        water.top(x - 0.5, z - 0.5, x + 0.5, z + 0.5, y, waterColor(w, x, z));
      } else {
        const step = 1 / GRAIN;
        for (let i = 0; i < GRAIN; i++)
          for (let j = 0; j < GRAIN; j++) {
            const x0 = x - 0.5 + i * step;
            const z0 = z - 0.5 + j * step;
            land.top(x0, z0, x0 + step, z0 + step, y, grass(tier, x * GRAIN + i, z * GRAIN + j));
          }
      }
      // Sides the camera sees: +x and +z, down to the neighbor (or the map's bed at the edge).
      const side = lake ? WATER.deep : shadeColor(TERRAIN[tier], 0.78); // cliff faces a little darker than the grass, so steps read
      const below = (nx: number, nz: number) => (inBounds(w, nx, nz) ? surface(nx, nz) : BED);
      const bx = below(x + 1, z);
      if (bx < y) (lake ? water : land).sideX(x + 0.5, z - 0.5, z + 0.5, bx, y, side);
      const bz = below(x, z + 1);
      if (bz < y) (lake ? water : land).sideZ(z + 0.5, x - 0.5, x + 0.5, bz, y, side);
    }
  }
  return { land, water };
}
