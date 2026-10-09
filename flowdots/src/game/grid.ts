export type Pos = { row: number; col: number };

export function posEqual(a: Pos, b: Pos): boolean {
  return a.row === b.row && a.col === b.col;
}

export function isAdjacent(a: Pos, b: Pos): boolean {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
}

export function inBounds(p: Pos, size: number): boolean {
  return p.row >= 0 && p.row < size && p.col >= 0 && p.col < size;
}

const NEIGHBOR_OFFSETS: readonly Pos[] = [
  { row: -1, col: 0 },
  { row: 1, col: 0 },
  { row: 0, col: -1 },
  { row: 0, col: 1 },
];

export function neighbors(p: Pos, size: number): Pos[] {
  const out: Pos[] = [];
  for (const o of NEIGHBOR_OFFSETS) {
    const n = { row: p.row + o.row, col: p.col + o.col };
    if (inBounds(n, size)) out.push(n);
  }
  return out;
}

// Orthogonal unit steps from `from` (exclusive) to `to` (inclusive), always stepping along the
// axis with more distance left so the route hugs the straight line between them. A fast swipe
// can jump several cells between two touch events; replaying these steps keeps the line intact.
export function cellsBetween(from: Pos, to: Pos): Pos[] {
  const steps: Pos[] = [];
  let { row, col } = from;
  while (row !== to.row || col !== to.col) {
    const dr = to.row - row;
    const dc = to.col - col;
    if (Math.abs(dr) >= Math.abs(dc)) row += Math.sign(dr);
    else col += Math.sign(dc);
    steps.push({ row, col });
  }
  return steps;
}
