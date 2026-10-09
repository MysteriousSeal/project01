import { cellsBetween, isAdjacent, neighbors } from '../src/game/grid';
import { p } from './helpers';

describe('grid', () => {
  test('isAdjacent is orthogonal-only', () => {
    expect(isAdjacent(p(1, 1), p(0, 1))).toBe(true);
    expect(isAdjacent(p(1, 1), p(1, 2))).toBe(true);
    expect(isAdjacent(p(1, 1), p(0, 0))).toBe(false);
    expect(isAdjacent(p(1, 1), p(1, 1))).toBe(false);
    expect(isAdjacent(p(1, 1), p(1, 3))).toBe(false);
  });

  test('neighbors stay in bounds', () => {
    expect(neighbors(p(0, 0), 3)).toHaveLength(2);
    expect(neighbors(p(1, 1), 3)).toHaveLength(4);
    expect(neighbors(p(0, 0), 1)).toHaveLength(0);
  });

  test('cellsBetween walks unit steps and ends on the target', () => {
    const from = p(0, 0);
    const to = p(3, 2);
    const steps = cellsBetween(from, to);
    expect(steps).toHaveLength(5);
    expect(steps[steps.length - 1]).toEqual(to);
    let prev = from;
    for (const s of steps) {
      expect(isAdjacent(prev, s)).toBe(true);
      prev = s;
    }
  });

  test('cellsBetween of a cell and itself is empty', () => {
    expect(cellsBetween(p(2, 2), p(2, 2))).toEqual([]);
  });
});
