// Voxel trees in EvenHold's style: a trunk with branches up to separate leaf puffs, each puff
// shaded on its own (dark underneath, sunlit on top), leaves dithered voxel by voxel. Six shapes,
// each drawn as one instanced mesh.
import * as THREE from 'three';
import { CHUNK, TILE_HEIGHT, TREE_SHAPES } from '../world/constants';
import { hash2, mulberry32 } from '../world/random';
import { tierAt, type World } from '../world/world';
import { LEAVES, TRUNK } from './palette';
import { QuadBuilder, vertexColored } from './voxels';

const V = 0.075; // voxel size in world units
type Grid = Map<string, number>;
const key = (x: number, y: number, z: number) => `${x},${y},${z}`;

function puff(grid: Grid, cx: number, cy: number, cz: number, r: number, ry: number, seed: number) {
  for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++)
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let z = Math.floor(cz - r); z <= Math.ceil(cz + r); z++) {
        const d = ((x - cx) / r) ** 2 + ((y - cy) / ry) ** 2 + ((z - cz) / r) ** 2;
        if (d > 1 || (d > 0.75 && hash2(x * 31 + y, z, seed) < 0.35)) continue; // ragged edges
        const up = (y - cy) / ry; // -1 underside .. 1 top
        let band = up > 0.35 ? 3 : up > -0.1 ? 2 : up > -0.55 ? 1 : 0;
        if (hash2(x + y * 7, z * 3, seed + 1) < 0.25) band = Math.max(0, band - 1); // dithered leaves
        grid.set(key(x, y, z), LEAVES[band]);
      }
}

function trunkColumn(grid: Grid, height: number) {
  for (let y = 0; y < height; y++) {
    const wide = y < 2; // a flared foot
    for (let x = wide ? -1 : 0; x <= (wide ? 2 : 1); x++)
      for (let z = wide ? -1 : 0; z <= (wide ? 2 : 1); z++) grid.set(key(x, y, z), hash2(x, y + z, 9) < 0.3 ? 0x5a3d26 : TRUNK);
  }
}

function branch(grid: Grid, from: [number, number, number], to: [number, number, number]) {
  const steps = Math.ceil(Math.max(...from.map((v, i) => Math.abs(v - to[i]))));
  for (let s = 0; s <= steps; s++) {
    const k = s / Math.max(1, steps);
    grid.set(key(Math.round(from[0] + (to[0] - from[0]) * k), Math.round(from[1] + (to[1] - from[1]) * k), Math.round(from[2] + (to[2] - from[2]) * k)), TRUNK);
  }
}

export function treeShape(shape: number): Grid {
  const rng = mulberry32(0x7ee + shape * 7919);
  const grid: Grid = new Map();
  const trunk = 9 + Math.floor(rng() * 5) + (shape >= 3 ? 3 : 0);
  trunkColumn(grid, trunk);
  const crownR = 4.6 + rng() * 1.6;
  puff(grid, 0.5, trunk + crownR * 0.7, 0.5, crownR, crownR * 0.8, shape * 3);
  const sides = 2 + Math.floor(rng() * 3);
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2 + rng();
    const reach = 3.5 + rng() * 2;
    const at: [number, number, number] = [0.5 + Math.cos(a) * reach, trunk - 1 + rng() * 3, 0.5 + Math.sin(a) * reach];
    branch(grid, [0, trunk - 3, 0], at);
    puff(grid, at[0], at[1] + 1, at[2], 2.6 + rng() * 1.2, 2.2, shape * 3 + i + 10);
  }
  return grid;
}

function shapeGeometry(grid: Grid): THREE.BufferGeometry {
  const q = new QuadBuilder();
  for (const [k, color] of grid) {
    const [x, y, z] = k.split(',').map(Number);
    const [x0, y0, z0] = [x * V, y * V, z * V];
    const [x1, y1, z1] = [x0 + V, y0 + V, z0 + V];
    if (!grid.has(key(x, y + 1, z))) q.top(x0, z0, x1, z1, y1, color);
    if (!grid.has(key(x + 1, y, z))) q.sideX(x1, z0, z1, y0, y1, color);
    if (!grid.has(key(x, y, z + 1))) q.sideZ(z1, x0, x1, y0, y1, color);
  }
  return q.geometry();
}

/** One instanced mesh per tree shape per chunk, so off-screen woods are skipped whole. */
export function buildTrees(w: World): THREE.Group {
  const group = new THREE.Group();
  const material = vertexColored();
  const shapes = Array.from({ length: TREE_SHAPES }, (_, s) => shapeGeometry(treeShape(s)));
  const m = new THREE.Matrix4();
  const byChunk = new Map<string, typeof w.trees>();
  for (const t of w.trees) {
    const k = `${Math.floor(Math.round(t.x) / CHUNK)},${Math.floor(Math.round(t.z) / CHUNK)},${t.shape}`;
    const list = byChunk.get(k);
    if (list) list.push(t);
    else byChunk.set(k, [t]);
  }
  for (const trees of byChunk.values()) {
    const mesh = new THREE.InstancedMesh(shapes[trees[0].shape], material, trees.length);
    trees.forEach((t, i) => mesh.setMatrixAt(i, m.makeTranslation(t.x - V / 2, tierAt(w, Math.round(t.x), Math.round(t.z)) * TILE_HEIGHT, t.z - V / 2)));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
  }
  return group;
}

/** Soft round shadows under every tree, one instanced mesh. */
export function buildTreeShadows(w: World): THREE.InstancedMesh {
  const geometry = new THREE.CircleGeometry(0.42, 16).rotateX(-Math.PI / 2);
  const mesh = new THREE.InstancedMesh(geometry, shadowMaterial(0.22), w.trees.length);
  const m = new THREE.Matrix4();
  w.trees.forEach((t, i) => mesh.setMatrixAt(i, m.makeTranslation(t.x + 0.12, tierAt(w, Math.round(t.x), Math.round(t.z)) * TILE_HEIGHT + 0.004, t.z + 0.06)));
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

export const shadowMaterial = (opacity: number) =>
  new THREE.MeshBasicMaterial({ color: 0x2b1d10, transparent: true, opacity, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 });
