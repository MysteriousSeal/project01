import { isAdjacent, Pos, posEqual } from './grid';
import { LevelDef } from './generate';

// paths[i] is color i's drawn line, ordered from the endpoint it was started from.
// Invariant: no cell appears in two paths, so total path length === covered cell count.
export type Paths = Pos[][];

export type PuzzleState = {
  paths: Paths;
  draggingColor: number | null;
  // Snapshots of `paths` from before each stroke or clear — what UNDO walks back through.
  history: Paths[];
};

const MAX_HISTORY = 100;

export function createPuzzleState(level: LevelDef): PuzzleState {
  return { paths: level.colors.map(() => []), draggingColor: null, history: [] };
}

function indexOfPos(path: Pos[], pos: Pos): number {
  return path.findIndex((p) => posEqual(p, pos));
}

function endpointColorAt(level: LevelDef, pos: Pos): number | null {
  const i = level.colors.findIndex((c) => posEqual(c.a, pos) || posEqual(c.b, pos));
  return i === -1 ? null : i;
}

function pathColorAt(paths: Paths, pos: Pos): number | null {
  const i = paths.findIndex((path) => indexOfPos(path, pos) !== -1);
  return i === -1 ? null : i;
}

// Which color owns this cell (drawn line or endpoint dot), or null if it's free.
export function cellColorAt(level: LevelDef, state: PuzzleState, pos: Pos): number | null {
  return pathColorAt(state.paths, pos) ?? endpointColorAt(level, pos);
}

export function isColorConnected(level: LevelDef, paths: Paths, color: number): boolean {
  const path = paths[color];
  if (path.length < 2) return false;
  const { a, b } = level.colors[color];
  const first = path[0];
  const last = path[path.length - 1];
  return (posEqual(first, a) && posEqual(last, b)) || (posEqual(first, b) && posEqual(last, a));
}

export function isSolved(level: LevelDef, state: PuzzleState): boolean {
  const covered = state.paths.reduce((sum, path) => sum + path.length, 0);
  return covered === level.size * level.size && level.colors.every((_, i) => isColorConnected(level, state.paths, i));
}

function withPath(paths: Paths, color: number, path: Pos[]): Paths {
  const next = paths.slice();
  next[color] = path;
  return next;
}

function pushHistory(state: PuzzleState): Paths[] {
  const history = [...state.history, state.paths];
  return history.length > MAX_HISTORY ? history.slice(history.length - MAX_HISTORY) : history;
}

function samePaths(a: Paths, b: Paths): boolean {
  return a.every((path, i) => path.length === b[i].length && path.every((p, j) => posEqual(p, b[i][j])));
}

// Starts a stroke at `pos`: an endpoint restarts that color's line from it; a cell on an
// existing line trims the line back to that cell and continues from there. Anything else
// (an empty cell) starts nothing.
export function beginDrag(level: LevelDef, state: PuzzleState, pos: Pos): PuzzleState {
  const endpointColor = endpointColorAt(level, pos);
  if (endpointColor !== null) {
    return {
      paths: withPath(state.paths, endpointColor, [pos]),
      draggingColor: endpointColor,
      history: pushHistory(state),
    };
  }
  const lineColor = pathColorAt(state.paths, pos);
  if (lineColor === null) return state;
  const path = state.paths[lineColor];
  return {
    paths: withPath(state.paths, lineColor, path.slice(0, indexOfPos(path, pos) + 1)),
    draggingColor: lineColor,
    history: pushHistory(state),
  };
}

// Moves the active line's head onto an adjacent cell, following the genre's rules:
// - stepping back onto your own line shortens it to that cell (covers simple "retract")
// - a connected line can be shortened but never extended past its second dot
// - another color's dot blocks; another color's line is cut where you cross it
// Invalid moves return the state unchanged — continuous drag input clips cells constantly.
export function continueDrag(level: LevelDef, state: PuzzleState, pos: Pos): PuzzleState {
  const color = state.draggingColor;
  if (color === null) return state;
  const path = state.paths[color];
  const head = path[path.length - 1];
  if (!head || posEqual(head, pos)) return state;

  const ownIndex = indexOfPos(path, pos);
  if (ownIndex !== -1) {
    return { ...state, paths: withPath(state.paths, color, path.slice(0, ownIndex + 1)) };
  }
  if (!isAdjacent(head, pos) || isColorConnected(level, state.paths, color)) return state;

  const endpointColor = endpointColorAt(level, pos);
  if (endpointColor !== null && endpointColor !== color) return state;

  let paths = state.paths;
  const crossed = pathColorAt(paths, pos);
  if (crossed !== null) {
    const other = paths[crossed];
    paths = withPath(paths, crossed, other.slice(0, indexOfPos(other, pos)));
  }
  return { ...state, paths: withPath(paths, color, [...path, pos]) };
}

// Ends the stroke. A stroke that changed nothing (grab and release) drops its history entry so
// UNDO never appears to do nothing.
export function endDrag(state: PuzzleState): PuzzleState {
  if (state.draggingColor === null) return state;
  const last = state.history[state.history.length - 1];
  const history = last && samePaths(last, state.paths) ? state.history.slice(0, -1) : state.history;
  return { ...state, draggingColor: null, history };
}

export function clearColor(state: PuzzleState, color: number): PuzzleState {
  if (state.paths[color].length === 0) return state;
  return { paths: withPath(state.paths, color, []), draggingColor: null, history: pushHistory(state) };
}

export function canUndo(state: PuzzleState): boolean {
  return state.history.length > 0;
}

export function undo(state: PuzzleState): PuzzleState {
  const previous = state.history[state.history.length - 1];
  if (!previous) return state;
  return { paths: previous, draggingColor: null, history: state.history.slice(0, -1) };
}

function matchesSolution(path: Pos[], solution: Pos[]): boolean {
  if (path.length !== solution.length) return false;
  const forward = path.every((p, i) => posEqual(p, solution[i]));
  return forward || path.every((p, i) => posEqual(p, solution[solution.length - 1 - i]));
}

// The color to reveal next: an unconnected one first, otherwise one that's connected along a
// route that differs from the generated solution (the "all lines done but board not full" case).
export function nextHint(level: LevelDef, state: PuzzleState): number | null {
  const unconnected = level.colors.findIndex((_, i) => !isColorConnected(level, state.paths, i));
  if (unconnected !== -1) return unconnected;
  const wrong = level.colors.findIndex((c, i) => !matchesSolution(state.paths[i], c.solution));
  return wrong === -1 ? null : wrong;
}

export type DragFeedback = 'connect' | 'step' | null;

// What the active line just did, for haptics: completing a connection outranks a plain step.
export function dragFeedback(level: LevelDef, prev: PuzzleState, next: PuzzleState): DragFeedback {
  const color = next.draggingColor;
  if (color === null) return null;
  const was = prev.paths[color];
  const now = next.paths[color];
  if (!isColorConnected(level, prev.paths, color) && isColorConnected(level, next.paths, color)) return 'connect';
  return was.length !== now.length ? 'step' : null;
}
