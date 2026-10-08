// The tiles a piece of scenery (a log, a boulder, a standing stone) stands on, from EvenHold's
// model/scenery/scenery.ts. The pieces themselves come later.
export interface Scenery {
  x: number;
  z: number;
  w: number;
  d: number;
}

export const sceneryTiles = (s: Pick<Scenery, 'x' | 'z' | 'w' | 'd'>): Array<[number, number]> =>
  Array.from({ length: s.w * s.d }, (_, i) => [s.x + (i % s.w), s.z + Math.floor(i / s.w)]);
