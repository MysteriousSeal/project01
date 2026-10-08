// World types from EvenHold's model/types.ts: the ones its world views draw (trees, bushes, the
// surfaces of tiles). Heroes, enemies, loot and the rest stay in EvenHold until they are ported.
import type { MapSize } from './map/grid';

export type TreeKind = 'oak' | 'pine' | 'birch';

export interface Tree {
  x: number;
  z: number;
  groundTier: number;
  kind: TreeKind;
  shape: number; // which voxel shape variant to draw
  quarterTurns: number; // 0-3, rotation about Y in 90-degree steps (grid-aligned)
}

export interface House {
  x: number;
  z: number;
  groundTier: number;
  rotationY: number;
}

// The inn and the blacksmith: two tiles long, standing on the square's
// outer ring with their door (local -Z) facing the well and their long side
// (local X) along the square's edge.
export type BuildingKind = 'inn' | 'smithy';

export interface Building {
  kind: BuildingKind;
  x: number; // center, halfway between its two tiles
  z: number;
  tiles: Array<[number, number]>;
  groundTier: number;
  quarterTurns: number; // rotation about Y in 90-degree steps
}

export type BushKind = 'leafy' | 'berry' | 'flowering';

export interface Bush {
  x: number;
  z: number;
  groundTier: number;
  kind: BushKind;
  shape: number; // which voxel shape variant to draw
  quarterTurns: number; // 0-3, rotation about Y in 90-degree steps (grid-aligned)
}

// A village's center tile, where its well stands in the middle of the square.
export interface Village {
  x: number;
  z: number;
  groundTier: number;
}

// What covers a dry tile's top. Water is tracked separately in lakeMap.
export type Surface = 'natural' | 'path' | 'plaza' | 'field';

export interface World {
  size: MapSize;
  heightMap: number[][];
  lakeMap: boolean[][];
  surfaceMap: Surface[][];
  trees: Tree[];
  bushes: Bush[];
}
