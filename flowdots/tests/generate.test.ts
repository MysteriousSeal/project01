import { generatePuzzle, MIN_SEGMENT, randomHamiltonianPath } from '../src/game/generate';
import { isAdjacent, Pos } from '../src/game/grid';
import { makeRng } from '../src/game/rng';

const key = (c: Pos) => `${c.row},${c.col}`;

function expectHamiltonian(path: Pos[], size: number) {
  expect(path).toHaveLength(size * size);
  expect(new Set(path.map(key)).size).toBe(size * size);
  for (let i = 1; i < path.length; i++) expect(isAdjacent(path[i - 1], path[i])).toBe(true);
}

describe('randomHamiltonianPath', () => {
  test.each([1, 2, 3, 5, 8, 11])('visits every cell of a %ix%i grid exactly once, in adjacent steps', (size) => {
    expectHamiltonian(randomHamiltonianPath(size, makeRng(size * 7)), size);
  });

  test('is deterministic per seed and varies across seeds', () => {
    const a = randomHamiltonianPath(6, makeRng(1));
    expect(randomHamiltonianPath(6, makeRng(1))).toEqual(a);
    expect(randomHamiltonianPath(6, makeRng(2))).not.toEqual(a);
  });

  test('moves away from the starting serpentine', () => {
    const path = randomHamiltonianPath(7, makeRng(42));
    const firstRowIsStraight = path.slice(0, 7).every((c, i) => c.row === 0 && c.col === i);
    expect(firstRowIsStraight).toBe(false);
  });
});

describe('generatePuzzle', () => {
  const level = generatePuzzle({ id: 9, size: 7, colorCount: 6, seed: 1234 });

  test('solutions are disjoint, contiguous, long enough, and cover the board', () => {
    expect(level.colors).toHaveLength(6);
    const seen = new Set<string>();
    for (const { a, b, solution } of level.colors) {
      expect(solution.length).toBeGreaterThanOrEqual(MIN_SEGMENT);
      expect(solution[0]).toEqual(a);
      expect(solution[solution.length - 1]).toEqual(b);
      for (let i = 1; i < solution.length; i++) expect(isAdjacent(solution[i - 1], solution[i])).toBe(true);
      for (const c of solution) {
        expect(seen.has(key(c))).toBe(false);
        seen.add(key(c));
      }
    }
    expect(seen.size).toBe(49);
  });

  test('is deterministic for a seed', () => {
    expect(generatePuzzle({ id: 9, size: 7, colorCount: 6, seed: 1234 })).toEqual(level);
  });

  test('rejects more colors than the board can fit', () => {
    expect(() => generatePuzzle({ id: 1, size: 3, colorCount: 4, seed: 1 })).toThrow();
  });
});
