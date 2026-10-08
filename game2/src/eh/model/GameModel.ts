// What EvenHold's world views read from its GameModel, for a world of countryside alone: the land,
// its lakes, trees and bushes. Villages, crypts, caves and camps are empty until they're ported,
// so the views (copied unchanged) simply draw none of them.
import { wholeMap, type Area, type MapSize } from './map/grid';
import { TilePatch, type Tiles } from './map/tiles';
import type { Scenery } from './scenery/scenery';
import type { Bush, Tree, World } from './types';

type Spot = { x: number; z: number };

export class GameModel {
  readonly area: Area;
  readonly tiles: Tiles;
  readonly trees: Tree[];
  readonly bushes: Bush[];
  readonly houses: Spot[] = [];
  readonly villages: Spot[] = [];
  readonly buildings: { tiles: Array<[number, number]> }[] = [];
  readonly crypts: { steps: Spot[]; tiles: Spot[] }[] = [];
  readonly caves: { rock: Spot[] }[] = [];
  readonly camps: Spot[] = [];
  readonly scenery: Scenery[] = [];
  // No woodcutting yet: every tree stands (EvenHold's lumber skill shakes, fells and stumps them).
  readonly lumber = { version: 0, chopping: null as { tree: Tree } | null, felled: (_tree: Tree) => false };

  constructor(
    readonly seed: number,
    readonly size: MapSize,
    world: World,
  ) {
    this.area = wholeMap(size);
    this.tiles = TilePatch.fromMaps(size, 0, 0, world);
    this.trees = world.trees;
    this.bushes = world.bushes;
  }
}
