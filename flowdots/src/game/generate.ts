import { Pos } from './grid';

export type LevelColor = { colorIndex: number; a: Pos; b: Pos };
export type LevelDef = { id: number; size: number; colors: LevelColor[] };
export type Solution = Record<number, Pos[]>; // colorIndex -> full solved path

const MIN_SIZE = 5;
const MAX_SIZE = 11;
const MIN_COLORS = 2;
const MAX_COLORS = 8; // theme.dotColors only defines 8 colors

export const WORLD_SIZE = 15;
const WORLD_NAMES = ['WARM-UP LINE', 'CROSSTOWN LINE', 'EXPRESS LINE', 'NIGHT LINE'];

export function difficultyForLevel(levelId: number): { size: number; colorCount: number } {
  const size = Math.min(MAX_SIZE, MIN_SIZE + Math.floor((levelId - 1) / 4));
  const colorCount = Math.min(MAX_COLORS, MIN_COLORS + Math.floor((levelId - 1) / 3));
  return { size, colorCount };
}

export function worldForLevel(levelId: number): number {
  return Math.floor((levelId - 1) / WORLD_SIZE);
}

export function worldName(worldIndex: number): string {
  return WORLD_NAMES[worldIndex] ?? `LINE ${worldIndex + 1}`;
}

// mulberry32: small, fast, deterministic from a 32-bit seed — same seed always yields the same puzzle.
function makeRng(seed: number) {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function baseSerpentine(size: number): Pos[] {
  const path: Pos[] = [];
  for (let row = 0; row < size; row++) {
    if (row % 2 === 0) {
      for (let col = 0; col < size; col++) path.push({ row, col });
    } else {
      for (let col = size - 1; col >= 0; col--) path.push({ row, col });
    }
  }
  return path;
}

// The 8 symmetries of a square grid (dihedral group D4) — each is a bijection on cells that
// preserves adjacency, so applying one to a Hamiltonian path yields another valid Hamiltonian path.
function applySymmetry(p: Pos, size: number, sym: number): Pos {
  const n = size - 1;
  switch (sym) {
    case 0:
      return p;
    case 1:
      return { row: p.col, col: n - p.row };
    case 2:
      return { row: n - p.row, col: n - p.col };
    case 3:
      return { row: n - p.col, col: p.row };
    case 4:
      return { row: p.row, col: n - p.col };
    case 5:
      return { row: n - p.row, col: p.col };
    case 6:
      return { row: p.col, col: p.row };
    default:
      return { row: n - p.col, col: n - p.row };
  }
}

// A full Hamiltonian path over the grid (visits every cell exactly once), varied per level via a
// random symmetry + optional reversal. Colors are later cut from contiguous slices of this path,
// which guarantees the puzzle is solvable and that a solution fills the entire board.
function buildHamiltonianPath(size: number, rng: () => number): Pos[] {
  const sym = Math.floor(rng() * 8);
  const reversed = rng() < 0.5;
  let path = baseSerpentine(size).map((p) => applySymmetry(p, size, sym));
  if (reversed) path = path.reverse();
  return path;
}

function cutIntoSegments(path: Pos[], colorCount: number, rng: () => number): Pos[][] {
  const lengths = new Array(colorCount).fill(2);
  let extra = path.length - 2 * colorCount;
  while (extra > 0) {
    lengths[Math.floor(rng() * colorCount)]++;
    extra--;
  }
  const segments: Pos[][] = [];
  let cursor = 0;
  for (const len of lengths) {
    segments.push(path.slice(cursor, cursor + len));
    cursor += len;
  }
  return segments;
}

function buildPuzzle(size: number, colorCount: number, seed: number): { size: number; segments: Pos[][] } {
  const rng = makeRng(seed);
  const path = buildHamiltonianPath(size, rng);
  return { size, segments: cutIntoSegments(path, colorCount, rng) };
}

function toLevelDef(id: number, built: { size: number; segments: Pos[][] }): LevelDef {
  return {
    id,
    size: built.size,
    colors: built.segments.map((seg, colorIndex) => ({ colorIndex, a: seg[0], b: seg[seg.length - 1] })),
  };
}

function toSolution(built: { segments: Pos[][] }): Solution {
  const solution: Solution = {};
  built.segments.forEach((seg, colorIndex) => {
    solution[colorIndex] = seg;
  });
  return solution;
}

export function generateLevel(levelId: number): LevelDef {
  const { size, colorCount } = difficultyForLevel(levelId);
  return toLevelDef(levelId, buildPuzzle(size, colorCount, levelId * 2654435761));
}

export function generateSolution(levelId: number): Solution {
  const { size, colorCount } = difficultyForLevel(levelId);
  return toSolution(buildPuzzle(size, colorCount, levelId * 2654435761));
}

const DAILY_SIZE = 8;
const DAILY_COLORS = 5;

function dailySeed(date: Date): number {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
}

// Daily challenges live outside the campaign's level-id space (negative ids) so they never
// collide with it, and are pinned to one fixed "medium" difficulty — only the layout varies
// day to day — so it's a fair, consistent habit regardless of main-campaign progress.
export function generateDaily(date: Date = new Date()): LevelDef {
  const seed = dailySeed(date);
  return toLevelDef(-seed, buildPuzzle(DAILY_SIZE, DAILY_COLORS, seed * 2654435761));
}

export function generateDailySolution(date: Date = new Date()): Solution {
  const seed = dailySeed(date);
  return toSolution(buildPuzzle(DAILY_SIZE, DAILY_COLORS, seed * 2654435761));
}
