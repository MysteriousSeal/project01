import { LevelDef } from './generate';

// Heuristic pace: a comfortable player clears one cell every ~0.9s once they see the pattern.
// 3 stars rewards a confident, no-backtracking solve; 1 star is just "you finished it."
const SECONDS_PER_CELL_FOR_3_STARS = 0.9;
const STAR_2_MULTIPLIER = 1.8;

export function parTimeMs(level: LevelDef): number {
  return level.size * level.size * SECONDS_PER_CELL_FOR_3_STARS * 1000;
}

export function starsForTime(level: LevelDef, timeMs: number): 1 | 2 | 3 {
  const par = parTimeMs(level);
  if (timeMs <= par) return 3;
  if (timeMs <= par * STAR_2_MULTIPLIER) return 2;
  return 1;
}
