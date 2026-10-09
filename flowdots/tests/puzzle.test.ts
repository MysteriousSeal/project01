import {
  beginDrag,
  canUndo,
  cellColorAt,
  clearColor,
  continueDrag,
  createPuzzleState,
  dragFeedback,
  endDrag,
  isColorConnected,
  isSolved,
  nextHint,
  undo,
} from '../src/game/puzzle';
import { makeLevel, p, stroke } from './helpers';

// 3x3, two colors:  0 0 0
//                   1 1 1
//                   1 1 1   (color 1 snakes from (1,0) to (2,0))
const TOP = [p(0, 0), p(0, 1), p(0, 2)];
const SNAKE = [p(1, 0), p(1, 1), p(1, 2), p(2, 2), p(2, 1), p(2, 0)];
const level = makeLevel(3, [TOP, SNAKE]);

describe('drawing', () => {
  test('pressing an empty cell starts nothing, and releasing it changes nothing', () => {
    const s = createPuzzleState(level);
    expect(beginDrag(level, s, p(1, 1))).toBe(s);
    expect(endDrag(s)).toBe(s);
  });

  test('drawing every solution solves the board', () => {
    let s = createPuzzleState(level);
    s = stroke(level, s, TOP);
    expect(isColorConnected(level, s.paths, 0)).toBe(true);
    expect(isSolved(level, s)).toBe(false);
    s = stroke(level, s, SNAKE);
    expect(isSolved(level, s)).toBe(true);
  });

  test('connected lines alone are not a solve if cells stay empty', () => {
    let s = stroke(level, createPuzzleState(level), TOP);
    s = stroke(level, s, [p(1, 0), p(2, 0)]);
    expect(level.colors.every((_, i) => isColorConnected(level, s.paths, i))).toBe(true);
    expect(isSolved(level, s)).toBe(false);
  });

  test('non-adjacent moves are ignored', () => {
    let s = beginDrag(level, createPuzzleState(level), p(0, 0));
    s = continueDrag(level, s, p(0, 2));
    expect(s.paths[0]).toEqual([p(0, 0)]);
  });

  test("another color's dot blocks the line", () => {
    let s = beginDrag(level, createPuzzleState(level), p(0, 0));
    s = continueDrag(level, s, p(1, 0));
    expect(s.paths[0]).toEqual([p(0, 0)]);
  });

  test('stepping back onto the line shortens it', () => {
    let s = beginDrag(level, createPuzzleState(level), p(1, 0));
    for (const c of [p(1, 1), p(1, 2), p(2, 2)]) s = continueDrag(level, s, c);
    s = continueDrag(level, s, p(1, 2));
    expect(s.paths[1]).toEqual([p(1, 0), p(1, 1), p(1, 2)]);
  });

  test('a connected line cannot be extended past its second dot', () => {
    const solo = makeLevel(3, [TOP]);
    let s = beginDrag(solo, createPuzzleState(solo), p(0, 0));
    s = continueDrag(solo, s, p(0, 1));
    s = continueDrag(solo, s, p(0, 2));
    expect(continueDrag(solo, s, p(1, 2))).toBe(s);
    expect(continueDrag(solo, s, p(0, 1)).paths[0]).toHaveLength(2); // but it can still be shortened
  });

  test("crossing another color's line cuts it at the crossing", () => {
    const lanes = makeLevel(3, [
      [p(0, 0), p(1, 0), p(2, 0)],
      [p(0, 2), p(1, 2), p(2, 2)],
    ]);
    let s = stroke(lanes, createPuzzleState(lanes), [p(0, 2), p(1, 2), p(1, 1)]);
    s = stroke(lanes, s, [p(0, 0), p(0, 1), p(1, 1)]);
    expect(s.paths[1]).toEqual([p(0, 2), p(1, 2)]);
    expect(s.paths[0]).toEqual([p(0, 0), p(0, 1), p(1, 1)]);
    expect(cellColorAt(lanes, s, p(1, 1))).toBe(0);
  });

  test('pressing mid-line trims it and continues from there', () => {
    let s = stroke(level, createPuzzleState(level), SNAKE.slice(0, 4));
    s = beginDrag(level, s, p(1, 1));
    expect(s.paths[1]).toEqual([p(1, 0), p(1, 1)]);
    expect(s.draggingColor).toBe(1);
  });
});

describe('undo and clear', () => {
  test('undo walks back whole strokes', () => {
    const empty = createPuzzleState(level);
    expect(canUndo(empty)).toBe(false);
    const one = stroke(level, empty, TOP);
    const two = stroke(level, one, SNAKE.slice(0, 3));
    expect(undo(two).paths).toEqual(one.paths);
    expect(undo(undo(two)).paths).toEqual(empty.paths);
    expect(canUndo(undo(undo(two)))).toBe(false);
  });

  test('a grab-and-release that changed nothing adds no undo step', () => {
    const partial = stroke(level, createPuzzleState(level), SNAKE.slice(0, 3));
    const touched = endDrag(beginDrag(level, partial, p(1, 2))); // grab the line's head, let go
    expect(touched.paths).toEqual(partial.paths);
    expect(touched.history).toHaveLength(partial.history.length);
  });

  test('pressing a dot restarts its line, and that is undoable', () => {
    const one = stroke(level, createPuzzleState(level), TOP);
    const restarted = endDrag(beginDrag(level, one, p(0, 2)));
    expect(restarted.paths[0]).toEqual([p(0, 2)]);
    expect(undo(restarted).paths).toEqual(one.paths);
  });

  test('clearing a line is undoable; clearing an empty line is a no-op', () => {
    const one = stroke(level, createPuzzleState(level), TOP);
    const cleared = clearColor(one, 0);
    expect(cleared.paths[0]).toEqual([]);
    expect(undo(cleared).paths).toEqual(one.paths);
    expect(clearColor(cleared, 0)).toBe(cleared);
  });
});

describe('hints', () => {
  test('points at the first unconnected color', () => {
    const s = createPuzzleState(level);
    expect(nextHint(level, s)).toBe(0);
    expect(nextHint(level, stroke(level, s, TOP))).toBe(1);
  });

  test('when everything is connected but the board is not full, points at the wrong route', () => {
    let s = stroke(level, createPuzzleState(level), TOP);
    s = stroke(level, s, [p(1, 0), p(2, 0)]);
    expect(nextHint(level, s)).toBe(1);
  });

  test('accepts a solution drawn in reverse', () => {
    let s = stroke(level, createPuzzleState(level), [...TOP].reverse());
    s = stroke(level, s, SNAKE);
    expect(nextHint(level, s)).toBeNull();
  });
});

describe('dragFeedback', () => {
  test('reports steps and the connecting move', () => {
    const start = beginDrag(level, createPuzzleState(level), p(0, 0));
    const stepped = continueDrag(level, start, p(0, 1));
    expect(dragFeedback(level, start, stepped)).toBe('step');
    expect(dragFeedback(level, stepped, continueDrag(level, stepped, p(0, 2)))).toBe('connect');
    expect(dragFeedback(level, stepped, stepped)).toBeNull();
  });
});
