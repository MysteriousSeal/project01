// The hero on the map: walking from joystick input, blocked by water, trees and the map's edge,
// hopping up and down terrain tiers. Pure, so it runs the same in tests and in the game.
import { TILE_HEIGHT } from '../world/constants';
import { inBounds, isLake, tierAt, type World } from '../world/world';

export const HERO_SPEED = 3.2; // tiles a second, as in EvenHold
export const HOP_DURATION = 0.18; // seconds to hop between tiers
export const HOP_HEIGHT = 0.12; // extra height at the top of the hop
export const HERO_RADIUS = 0.18;
export const TRUNK_RADIUS = 0.16;
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

export const tileOf = (v: number) => Math.round(v);
export const groundY = (w: World, x: number, z: number) => tierAt(w, tileOf(x), tileOf(z)) * TILE_HEIGHT;

export function createHero(w: World): Hero {
  return { x: w.spawn.x, z: w.spawn.z, y: groundY(w, w.spawn.x, w.spawn.z), facing: Math.PI / 4, walk: 0, moving: false, hop: null };
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

/** Trees near a point, from a coarse grid so collision stays cheap on big forests. */
export type TreeIndex = Map<number, { x: number; z: number }[]>;
const cellKey = (x: number, z: number) => x * 4096 + z;

export function indexTrees(w: World): TreeIndex {
  const index: TreeIndex = new Map();
  for (const t of w.trees) {
    const k = cellKey(tileOf(t.x), tileOf(t.z));
    const list = index.get(k);
    if (list) list.push(t);
    else index.set(k, [t]);
  }
  return index;
}

export function blocked(w: World, trees: TreeIndex, x: number, z: number): boolean {
  const r = HERO_RADIUS;
  if (x < -0.5 + r || z < -0.5 + r || x > w.size - 0.5 - r || z > w.size - 0.5 - r) return true;
  for (const [ox, oz] of [[r, r], [r, -r], [-r, r], [-r, -r]]) {
    const tx = tileOf(x + ox);
    const tz = tileOf(z + oz);
    if (!inBounds(w, tx, tz) || isLake(w, tx, tz)) return true;
  }
  const cx = tileOf(x);
  const cz = tileOf(z);
  for (let ix = cx - 1; ix <= cx + 1; ix++) {
    for (let iz = cz - 1; iz <= cz + 1; iz++) {
      for (const t of trees.get(cellKey(ix, iz)) ?? []) {
        if (Math.hypot(t.x - x, t.z - z) < r + TRUNK_RADIUS) return true;
      }
    }
  }
  return false;
}

const angleDiff = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

export function stepHero(h: Hero, w: World, trees: TreeIndex, input: Input, dt: number): Hero {
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
    if (!blocked(w, trees, h.x + mx, h.z)) next.x = h.x + mx;
    if (!blocked(w, trees, next.x, h.z + mz)) next.z = h.z + mz;
    const target = Math.atan2(dx, dz);
    next.facing = h.facing + angleDiff(target, h.facing) * Math.min(1, TURN_RATE * dt);
    next.walk = h.walk + dt * speed * 3.2;
  } else {
    next.walk = 0;
  }

  // Height: hop when the tile underfoot changes tier.
  const ground = groundY(w, next.x, next.z);
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
