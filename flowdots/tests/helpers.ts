import { LevelDef } from '../src/game/generate';
import { Pos } from '../src/game/grid';
import { beginDrag, continueDrag, endDrag, PuzzleState } from '../src/game/puzzle';

export const p = (row: number, col: number): Pos => ({ row, col });

// Builds a hand-made level from solution routes; each route's ends become that color's dots.
export function makeLevel(size: number, solutions: Pos[][]): LevelDef {
  return {
    id: 0,
    size,
    colors: solutions.map((solution) => ({ a: solution[0], b: solution[solution.length - 1], solution })),
  };
}

// One full stroke: press on the first cell, slide through the rest, release.
export function stroke(level: LevelDef, state: PuzzleState, cells: Pos[]): PuzzleState {
  let s = beginDrag(level, state, cells[0]);
  for (const cell of cells.slice(1)) s = continueDrag(level, s, cell);
  return endDrag(s);
}
