export type Pos = { row: number; col: number };

export function posKey(p: Pos): string {
  return `${p.row},${p.col}`;
}

export function posEqual(a: Pos, b: Pos): boolean {
  return a.row === b.row && a.col === b.col;
}

export function isAdjacent(a: Pos, b: Pos): boolean {
  const dr = Math.abs(a.row - b.row);
  const dc = Math.abs(a.col - b.col);
  return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
}

export function inBounds(p: Pos, size: number): boolean {
  return p.row >= 0 && p.row < size && p.col >= 0 && p.col < size;
}

export const NEIGHBOR_OFFSETS: Pos[] = [
  { row: -1, col: 0 },
  { row: 1, col: 0 },
  { row: 0, col: -1 },
  { row: 0, col: 1 },
];

export function neighbors(p: Pos, size: number): Pos[] {
  return NEIGHBOR_OFFSETS.map((o) => ({ row: p.row + o.row, col: p.col + o.col })).filter((n) =>
    inBounds(n, size),
  );
}
