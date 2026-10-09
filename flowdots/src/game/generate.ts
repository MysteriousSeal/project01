import { Pos } from './grid';
import { makeRng, randomInt, Rng } from './rng';

// A color's identity is its index in `LevelDef.colors` (and in `PuzzleState.paths`).
export type LevelColor = { a: Pos; b: Pos; solution: Pos[] };
export type LevelDef = { id: number; size: number; colors: LevelColor[] };

// Every color gets at least one empty cell between its dots, so no line is a free gimme.
export const MIN_SEGMENT = 3;
const BACKBITE_MOVES_PER_CELL = 40;

// Random Hamiltonian path (visits every cell exactly once) via "backbite" moves: start from a
// trivial serpentine, then repeatedly link an end cell to one of its grid neighbors and reverse
// the stretch in between. Each move keeps the path Hamiltonian, and enough of them shuffle it
// into a winding shape — unlike the serpentine itself, whose cuts read as obvious stripes.
export function randomHamiltonianPath(size: number, rng: Rng): Pos[] {
  const n = size * size;
  const path = new Int32Array(n); // position in path -> cell id (row * size + col)
  const indexOf = new Int32Array(n); // cell id -> position in path
  for (let row = 0, i = 0; row < size; row++) {
    for (let k = 0; k < size; k++, i++) {
      const col = row % 2 === 0 ? k : size - 1 - k;
      path[i] = row * size + col;
      indexOf[row * size + col] = i;
    }
  }

  const reverse = (from: number, to: number) => {
    for (let i = from, j = to; i < j; i++, j--) {
      const t = path[i];
      path[i] = path[j];
      path[j] = t;
      indexOf[path[i]] = i;
      indexOf[path[j]] = j;
    }
  };

  const moves = n * BACKBITE_MOVES_PER_CELL;
  for (let m = 0; m < moves && n > 2; m++) {
    const fromTail = rng() < 0.5;
    const end = path[fromTail ? n - 1 : 0];
    const row = Math.floor(end / size);
    const col = end % size;
    const dir = randomInt(rng, 4);
    const nRow = row + (dir === 0 ? -1 : dir === 1 ? 1 : 0);
    const nCol = col + (dir === 2 ? -1 : dir === 3 ? 1 : 0);
    if (nRow < 0 || nRow >= size || nCol < 0 || nCol >= size) continue;
    const j = indexOf[nRow * size + nCol];
    if (fromTail) {
      if (j !== n - 2) reverse(j + 1, n - 1);
    } else if (j !== 1) {
      reverse(0, j - 1);
    }
  }

  return Array.from(path, (id) => ({ row: Math.floor(id / size), col: id % size }));
}

// Splits the path into `colorCount` contiguous runs of at least MIN_SEGMENT cells. Contiguous
// runs of one Hamiltonian path are disjoint and together cover the board, so the cut itself is
// a guaranteed full-board solution.
function cutIntoSegments(path: Pos[], colorCount: number, rng: Rng): Pos[][] {
  const lengths = new Array<number>(colorCount).fill(MIN_SEGMENT);
  for (let extra = path.length - MIN_SEGMENT * colorCount; extra > 0; extra--) {
    lengths[randomInt(rng, colorCount)]++;
  }
  const segments: Pos[][] = [];
  let cursor = 0;
  for (const len of lengths) {
    segments.push(path.slice(cursor, cursor + len));
    cursor += len;
  }
  return segments;
}

export function generatePuzzle(opts: { id: number; size: number; colorCount: number; seed: number }): LevelDef {
  const { id, size, colorCount, seed } = opts;
  if (colorCount * MIN_SEGMENT > size * size) {
    throw new Error(`Cannot fit ${colorCount} colors on a ${size}x${size} board`);
  }
  const rng = makeRng(seed);
  const segments = cutIntoSegments(randomHamiltonianPath(size, rng), colorCount, rng);
  return {
    id,
    size,
    colors: segments.map((solution) => ({ a: solution[0], b: solution[solution.length - 1], solution })),
  };
}
