import {
  campaignLevel,
  dailyLevel,
  dateKey,
  difficultyForLevel,
  isLevelId,
  LEVEL_COUNT,
  levelsInWorld,
  MAX_COLORS,
  WORLD_COUNT,
  worldForLevel,
} from '../src/game/levels';
import { createPuzzleState, isSolved } from '../src/game/puzzle';
import { stroke } from './helpers';

describe('campaign', () => {
  test('difficulty never decreases and stays within the palette', () => {
    let prev = difficultyForLevel(1);
    for (let id = 2; id <= LEVEL_COUNT; id++) {
      const d = difficultyForLevel(id);
      expect(d.size).toBeGreaterThanOrEqual(prev.size);
      expect(d.colorCount).toBeGreaterThanOrEqual(prev.colorCount);
      expect(d.colorCount).toBeLessThanOrEqual(MAX_COLORS);
      prev = d;
    }
  });

  // End-to-end guarantee: every shipped level generates, and drawing its own solution through the
  // real input rules solves it.
  test('every campaign level is solvable through the drag rules', () => {
    for (let id = 1; id <= LEVEL_COUNT; id++) {
      const level = campaignLevel(id);
      let state = createPuzzleState(level);
      for (const color of level.colors) state = stroke(level, state, color.solution);
      expect(isSolved(level, state)).toBe(true);
    }
  });

  test('levels are stable across calls', () => {
    expect(campaignLevel(17)).toEqual(campaignLevel(17));
  });

  test('worlds partition the campaign', () => {
    const all = Array.from({ length: WORLD_COUNT }, (_, w) => levelsInWorld(w)).flat();
    expect(all).toEqual(Array.from({ length: LEVEL_COUNT }, (_, i) => i + 1));
    for (const id of all) expect(levelsInWorld(worldForLevel(id))).toContain(id);
  });

  test('isLevelId accepts only campaign ids', () => {
    expect(isLevelId(1)).toBe(true);
    expect(isLevelId(LEVEL_COUNT)).toBe(true);
    expect(isLevelId(0)).toBe(false);
    expect(isLevelId(LEVEL_COUNT + 1)).toBe(false);
    expect(isLevelId(2.5)).toBe(false);
    expect(isLevelId(NaN)).toBe(false);
  });
});

describe('daily', () => {
  test('same date gives the same puzzle; different dates differ', () => {
    const day = new Date(2026, 9, 10);
    expect(dailyLevel(new Date(2026, 9, 10, 23, 59))).toEqual(dailyLevel(day));
    expect(dailyLevel(new Date(2026, 9, 11))).not.toEqual(dailyLevel(day));
  });

  test('daily ids never collide with campaign ids', () => {
    expect(dailyLevel(new Date(2026, 0, 1)).id).toBeLessThan(0);
  });

  test('dateKey is zero-padded local date', () => {
    expect(dateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});
