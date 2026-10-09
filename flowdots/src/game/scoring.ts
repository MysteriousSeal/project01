import { LevelDef } from './generate';

export type Stars = 1 | 2 | 3;

// Heuristic pace: a confident player clears about one cell every 0.9s once they see the
// pattern. 3 stars rewards that pace, 2 stars allows some backtracking, 1 star is "you finished".
const SECONDS_PER_CELL_FOR_3_STARS = 0.9;
const STAR_2_MULTIPLIER = 1.8;

export function parTimeMs(level: LevelDef): number {
  return level.size * level.size * SECONDS_PER_CELL_FOR_3_STARS * 1000;
}

export function starsForTime(level: LevelDef, timeMs: number): Stars {
  const par = parTimeMs(level);
  if (timeMs <= par) return 3;
  if (timeMs <= par * STAR_2_MULTIPLIER) return 2;
  return 1;
}

export function formatClock(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
