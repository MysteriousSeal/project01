// The hero on EvenHold's map: walking from joystick input, blocked by water, tree trunks, bushes
// and the map's edge (EvenHold's footprints), hopping up and down terrain tiers. Pure, so it runs
// the same in tests and in the game.
import { BUSH_COLLISION_HALF, HERO_RADIUS, HERO_SPEED, HOP_DURATION, HOP_HEIGHT, TILE_HEIGHT, TREE_COLLISION_HALF } from '../eh/model/constants';
import { spawnOf } from '../eh/model/map/grid';
import type { GameModel } from '../eh/model/GameModel';

export { HERO_SPEED, HOP_DURATION, HOP_HEIGHT };
const TURN_RATE = 14; // how fast the hero turns toward where they walk

export type Hero = {
  x: number;
  z: number;
  y: number;
  facing: number; // radians, 0 = +z
  walk: number; // stride phase, for the legs
  moving: boolean;
  hop: { from: number; to: number; t: number } | null;
};

export type Input = { x: number; y: number }; // joystick, screen space, -1..1 (y down)
export type Land = Pick<GameModel, 'size' | 'tiles' | 'trees' | 'bushes'>;

export const tileOf = (v: number) => Math.round(v);
export const groundY = (land: Land, x: number, z: number) => land.tiles.height(tileOf(x), tileOf(z)) * TILE_HEIGHT;

export function createHero(land: Land): Hero {
  const { x, z } = spawnOf(land.size);
  return { x, z, y: groundY(land, x, z), facing: Math.PI / 4, walk: 0, moving: false, hop: null };
}

/**
 * The camera looks down the (-1, -1) diagonal, so pushing the stick up walks away from it
 * (toward -x -z) and right walks toward +x -z.
 */
export function inputToWorld(input: Input): { dx: number; dz: number } {
  const s = Math.SQRT1_2;
  // right = (+x, -z), away from the camera = (-x, -z); the stick's y grows downward
  return { dx: (input.x + input.y) * s, dz: (input.y - input.x) * s };
}

/** Square footprints (half-widths) near each tile, from a coarse index so collision stays cheap. */
type Blocker = { x: number; z: number; half: number };
export type Blockers = Map<number, Blocker[]>;
const cellKey = (x: number, z: number) => x * 65536 + z;

export function indexBlockers(land: Land): Blockers {
  const index: Blockers = new Map();
  const add = (b: Blocker) => {
    const k = cellKey(tileOf(b.x), tileOf(b.z));
    const list = index.get(k);
    if (list) list.push(b);
    else index.set(k, [b]);
  };
  for (const t of land.trees) add({ x: t.x, z: t.z, half: TREE_COLLISION_HALF });
  for (const b of land.bushes) add({ x: b.x, z: b.z, half: BUSH_COLLISION_HALF });
  return index;
}

export function blocked(land: Land, blockers: Blockers, x: number, z: number): boolean {
  const r = HERO_RADIUS;
  const { width, depth } = land.size;
  if (x < -0.5 + r || z < -0.5 + r || x > width - 0.5 - r || z > depth - 0.5 - r) return true;
  for (const [ox, oz] of [[r, r], [r, -r], [-r, r], [-r, -r]]) if (land.tiles.lake(tileOf(x + ox), tileOf(z + oz))) return true;
  const cx = tileOf(x);
  const cz = tileOf(z);
  for (let ix = cx - 1; ix <= cx + 1; ix++)
    for (let iz = cz - 1; iz <= cz + 1; iz++)
      for (const b of blockers.get(cellKey(ix, iz)) ?? []) if (Math.abs(b.x - x) < r + b.half && Math.abs(b.z - z) < r + b.half) return true;
  return false;
}

const angleDiff = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

export function stepHero(h: Hero, land: Land, blockers: Blockers, input: Input, dt: number): Hero {
  const mag = Math.min(1, Math.hypot(input.x, input.y));
  const next = { ...h };
  next.moving = mag > 0.15;
  if (next.moving) {
    const { dx, dz } = inputToWorld(input);
    const len = Math.hypot(dx, dz) || 1;
    const speed = HERO_SPEED * mag;
    const mx = (dx / len) * speed * dt;
    const mz = (dz / len) * speed * dt;
    // Slide along whatever blocks the way: try each axis on its own.
    if (!blocked(land, blockers, h.x + mx, h.z)) next.x = h.x + mx;
    if (!blocked(land, blockers, next.x, h.z + mz)) next.z = h.z + mz;
    next.facing = h.facing + angleDiff(Math.atan2(dx, dz), h.facing) * Math.min(1, TURN_RATE * dt);
    next.walk = h.walk + dt * speed * 3.2;
  } else {
    next.walk = 0;
  }

  // Height: hop when the tile underfoot changes tier.
  const ground = groundY(land, next.x, next.z);
  if (next.hop) {
    const t = Math.min(1, next.hop.t + dt / HOP_DURATION);
    next.hop = t >= 1 ? null : { ...next.hop, t };
    if (next.hop && next.hop.to !== ground) next.hop = { from: next.y, to: ground, t: 0 };
  } else if (Math.abs(ground - next.y) > 1e-6) {
    next.hop = { from: next.y, to: ground, t: 0 };
  }
  next.y = next.hop ? next.hop.from + (next.hop.to - next.hop.from) * next.hop.t + Math.sin(Math.PI * next.hop.t) * HOP_HEIGHT : ground;
  return next;
}
