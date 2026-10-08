// The one piece of EvenHold's lumber skill the world's look needs: which trees have grown ancient
// (drawn darker and older). The chopping itself comes with the skill when it's ported.
import { hashUnit } from '../../util/random';
import type { Tree } from '../types';

export type Grade = 'birch' | 'pine' | 'oak' | 'ancientPine' | 'ancientOak';
export const ANCIENT = 1 / 12; // of the pines and oaks, grown ancient
export const gradeOf = (tree: Tree, seed: number): Grade => (tree.kind !== 'birch' && hashUnit(tree.x, tree.z, seed + 404) < ANCIENT ? (tree.kind === 'pine' ? 'ancientPine' : 'ancientOak') : tree.kind);
