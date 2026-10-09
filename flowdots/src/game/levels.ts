import { generatePuzzle, LevelDef } from './generate';
import { hashSeed } from './rng';

export const WORLD_SIZE = 15;
const WORLD_NAMES = ['WARM-UP LINE', 'CROSSTOWN LINE', 'EXPRESS LINE', 'NIGHT LINE'];
export const WORLD_COUNT = WORLD_NAMES.length;
export const LEVEL_COUNT = WORLD_SIZE * WORLD_COUNT;

const MIN_SIZE = 5;
const MAX_SIZE = 11;
const MIN_COLORS = 2;
export const MAX_COLORS = 8; // ui/theme defines exactly this many line colors

// Grid grows every 4 levels and adds a color every 3, so the two pressures alternate instead of
// spiking together. Both cap out, after which levels vary only in layout.
export function difficultyForLevel(levelId: number): { size: number; colorCount: number } {
  return {
    size: Math.min(MAX_SIZE, MIN_SIZE + Math.floor((levelId - 1) / 4)),
    colorCount: Math.min(MAX_COLORS, MIN_COLORS + Math.floor((levelId - 1) / 3)),
  };
}

export function isLevelId(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= LEVEL_COUNT;
}

export function worldForLevel(levelId: number): number {
  return Math.floor((levelId - 1) / WORLD_SIZE);
}

export function worldName(worldIndex: number): string {
  return WORLD_NAMES[worldIndex] ?? `LINE ${worldIndex + 1}`;
}

export function levelsInWorld(worldIndex: number): number[] {
  return Array.from({ length: WORLD_SIZE }, (_, i) => worldIndex * WORLD_SIZE + i + 1);
}

export function campaignLevel(levelId: number): LevelDef {
  return generatePuzzle({ id: levelId, ...difficultyForLevel(levelId), seed: hashSeed(levelId) });
}

const DAILY_SIZE = 8;
const DAILY_COLORS = 5;

export function dateKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

// Pinned to one "medium" difficulty so the daily is a fair habit for every player regardless of
// campaign progress; only the layout changes day to day. The negative id keeps it out of the
// campaign's id space entirely.
export function dailyLevel(date: Date): LevelDef {
  const dayNumber = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  return generatePuzzle({ id: -dayNumber, size: DAILY_SIZE, colorCount: DAILY_COLORS, seed: hashSeed(dayNumber) });
}
