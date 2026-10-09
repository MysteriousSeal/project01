import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  dailyStatus,
  loadProgress,
  parseProgress,
  recordDailyComplete,
  recordLevelComplete,
} from '../src/storage/progress';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

beforeEach(() => AsyncStorage.clear());

const day = (d: number) => new Date(2026, 9, d);

describe('parseProgress', () => {
  test('falls back to defaults for missing or corrupt data', () => {
    expect(parseProgress(null).highestUnlocked).toBe(1);
    expect(parseProgress('{not json').highestUnlocked).toBe(1);
  });

  test('keeps valid fields and drops malformed ones', () => {
    const p = parseProgress(
      JSON.stringify({
        highestUnlocked: -3,
        levels: { 1: { bestTimeMs: 1000, stars: 2 }, 2: { bestTimeMs: 'x', stars: 9 } },
        dailyStreak: 4,
        lastDailyDate: 42,
      }),
    );
    expect(p.highestUnlocked).toBe(1);
    expect(p.levels).toEqual({ 1: { bestTimeMs: 1000, stars: 2 } });
    expect(p.dailyStreak).toBe(4);
    expect(p.lastDailyDate).toBeNull();
  });
});

describe('level records', () => {
  test('keep the best time and best stars independently, and unlock the next level', async () => {
    await recordLevelComplete(3, 20_000, 2);
    const record = await recordLevelComplete(3, 30_000, 3);
    expect(record).toEqual({ bestTimeMs: 20_000, stars: 3 });
    expect((await loadProgress()).highestUnlocked).toBe(4);
  });

  test('replaying an earlier level never re-locks later ones', async () => {
    await recordLevelComplete(5, 1000, 3);
    await recordLevelComplete(1, 1000, 3);
    expect((await loadProgress()).highestUnlocked).toBe(6);
  });

  test('concurrent saves do not overwrite each other', async () => {
    await Promise.all([recordLevelComplete(1, 1000, 3), recordLevelComplete(2, 2000, 1)]);
    expect(Object.keys((await loadProgress()).levels).sort()).toEqual(['1', '2']);
  });
});

describe('daily streak', () => {
  test('grows on consecutive days, ignores repeats, resets after a gap', async () => {
    expect((await recordDailyComplete(day(1))).streak).toBe(1);
    expect((await recordDailyComplete(day(1))).streak).toBe(1);
    expect((await recordDailyComplete(day(2))).streak).toBe(2);
    expect((await recordDailyComplete(day(4))).streak).toBe(1);
  });

  test('status shows a broken streak as 0 before the next completion', async () => {
    await recordDailyComplete(day(1));
    await recordDailyComplete(day(2));
    const p = await loadProgress();
    expect(dailyStatus(p, day(2))).toEqual({ streak: 2, completedToday: true });
    expect(dailyStatus(p, day(3))).toEqual({ streak: 2, completedToday: false });
    expect(dailyStatus(p, day(5))).toEqual({ streak: 0, completedToday: false });
  });

  test('streak survives a month boundary', async () => {
    await recordDailyComplete(new Date(2026, 9, 31));
    expect((await recordDailyComplete(new Date(2026, 10, 1))).streak).toBe(2);
  });
});
