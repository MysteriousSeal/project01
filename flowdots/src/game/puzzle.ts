import { isAdjacent, Pos, posEqual } from './grid';
import { LevelDef } from './generate';

export type PuzzleState = {
  // colorIndex -> ordered list of cells drawn so far, from one endpoint toward the other.
  paths: Record<number, Pos[]>;
  draggingColor: number | null;
  // Last color any player action touched — what a plain "undo" button reverts.
  lastTouchedColor: number | null;
};

export function createPuzzleState(level: LevelDef): PuzzleState {
  const paths: Record<number, Pos[]> = {};
  for (const c of level.colors) paths[c.colorIndex] = [];
  return { paths, draggingColor: null, lastTouchedColor: null };
}

function endpointColorAt(level: LevelDef, pos: Pos): number | null {
  for (const c of level.colors) {
    if (posEqual(c.a, pos) || posEqual(c.b, pos)) return c.colorIndex;
  }
  return null;
}

// Which color currently occupies this cell (drawn path or an untouched endpoint), or null if free.
export function cellColorAt(level: LevelDef, state: PuzzleState, pos: Pos): number | null {
  for (const c of level.colors) {
    if (state.paths[c.colorIndex].some((p) => posEqual(p, pos))) return c.colorIndex;
  }
  return endpointColorAt(level, pos);
}

export function isColorConnected(level: LevelDef, state: PuzzleState, colorIndex: number): boolean {
  const path = state.paths[colorIndex];
  const color = level.colors.find((c) => c.colorIndex === colorIndex);
  if (!color || path.length < 2) return false;
  const first = path[0];
  const last = path[path.length - 1];
  return (
    (posEqual(first, color.a) && posEqual(last, color.b)) ||
    (posEqual(first, color.b) && posEqual(last, color.a))
  );
}

export function isSolved(level: LevelDef, state: PuzzleState): boolean {
  const covered = level.colors.reduce((sum, c) => sum + state.paths[c.colorIndex].length, 0);
  if (covered !== level.size * level.size) return false;
  return level.colors.every((c) => isColorConnected(level, state, c.colorIndex));
}

// Starts (or resumes) dragging a color from `pos`. Valid only if `pos` is one of that color's
// endpoints, or an already-drawn cell of that color's own path (lets the player retract and redraw).
export function beginDrag(level: LevelDef, state: PuzzleState, pos: Pos): PuzzleState {
  const colorIndex = endpointColorAt(level, pos);
  if (colorIndex !== null) {
    const nextPaths = { ...state.paths, [colorIndex]: [pos] };
    return { ...state, paths: nextPaths, draggingColor: colorIndex, lastTouchedColor: colorIndex };
  }

  for (const c of level.colors) {
    const idx = state.paths[c.colorIndex].findIndex((p) => posEqual(p, pos));
    if (idx !== -1) {
      const trimmed = state.paths[c.colorIndex].slice(0, idx + 1);
      return {
        ...state,
        paths: { ...state.paths, [c.colorIndex]: trimmed },
        draggingColor: c.colorIndex,
        lastTouchedColor: c.colorIndex,
      };
    }
  }
  return state;
}

// Extends (or retracts) the actively-dragged color's path toward an adjacent cell. No-ops on any
// invalid move (not adjacent, occupied by another color, self-crossing) rather than erroring, since
// this is driven by continuous drag input that will often clip a cell it can't actually move into.
export function continueDrag(level: LevelDef, state: PuzzleState, pos: Pos): PuzzleState {
  const colorIndex = state.draggingColor;
  if (colorIndex === null) return state;
  // Once this color already connects both its endpoints, it's locked — further drag motion
  // (the finger sliding past the second dot) must not keep appending cells to it.
  if (isColorConnected(level, state, colorIndex)) return state;
  const path = state.paths[colorIndex];
  const head = path[path.length - 1];
  if (!head || posEqual(head, pos)) return state;

  // Dragging back over the previous cell retracts (undo) by one step.
  if (path.length >= 2 && posEqual(path[path.length - 2], pos)) {
    return {
      ...state,
      paths: { ...state.paths, [colorIndex]: path.slice(0, -1) },
      lastTouchedColor: colorIndex,
    };
  }

  if (!isAdjacent(head, pos)) return state;
  if (path.some((p) => posEqual(p, pos))) return state; // no self-crossing

  const occupant = cellColorAt(level, state, pos);
  const isOwnEndpoint = endpointColorAt(level, pos) === colorIndex;
  if (occupant !== null && occupant !== colorIndex && !isOwnEndpoint) return state; // can't cross another color
  if (occupant === colorIndex && !isOwnEndpoint) return state; // already part of this path elsewhere (shouldn't happen, guarded above)

  const color = level.colors.find((c) => c.colorIndex === colorIndex)!;
  const isOtherEndpoint = posEqual(pos, color.a) || posEqual(pos, color.b);
  if (isOtherEndpoint && path.length === 1 && posEqual(path[0], pos)) return state;

  return {
    ...state,
    paths: { ...state.paths, [colorIndex]: [...path, pos] },
    lastTouchedColor: colorIndex,
  };
}

export function endDrag(state: PuzzleState): PuzzleState {
  return { ...state, draggingColor: null };
}

// Removes the last cell from whichever color was most recently touched. Never crosses into
// another color — it reverts your last action, not a global history.
export function undo(state: PuzzleState): PuzzleState {
  const colorIndex = state.lastTouchedColor;
  if (colorIndex === null) return state;
  const path = state.paths[colorIndex];
  if (path.length === 0) return state;
  return { ...state, paths: { ...state.paths, [colorIndex]: path.slice(0, -1) }, draggingColor: null };
}

export function clearColor(state: PuzzleState, colorIndex: number): PuzzleState {
  return { ...state, paths: { ...state.paths, [colorIndex]: [] } };
}
