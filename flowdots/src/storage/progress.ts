import AsyncStorage from '@react-native-async-storage/async-storage';
import { dateKey } from '../game/levels';
import { Stars } from '../game/scoring';

const KEY = 'flowdots.progress';

export type LevelRecord = { bestTimeMs: number; stars: Stars };
export type Progress = {
  highestUnlocked: number;
  levels: Record<number, LevelRecord>;
  dailyStreak: number;
  lastDailyDate: string | null; // dateKey() of the last completed daily
};

export function emptyProgress(): Progress {
  return { highestUnlocked: 1, levels: {}, dailyStreak: 0, lastDailyDate: null };
}

function isRecord(v: unknown): v is LevelRecord {
  const r = v as LevelRecord;
  return !!r && Number.isFinite(r.bestTimeMs) && (r.stars === 1 || r.stars === 2 || r.stars === 3);
}

// Storage is a trust boundary: anything malformed (older format, partial write) falls back to a
// safe default field by field instead of crashing the level map.
export function parseProgress(raw: string | null): Progress {
  const base = emptyProgress();
  if (!raw) return base;
  let data: Partial<Progress>;
  try {
    data = JSON.parse(raw);
  } catch {
    return base;
  }
  const levels: Record<number, LevelRecord> = {};
  for (const [id, record] of Object.entries(data.levels ?? {})) {
    if (isRecord(record)) levels[Number(id)] = record;
  }
  return {
    highestUnlocked: Number.isInteger(data.highestUnlocked) && data.highestUnlocked! >= 1 ? data.highestUnlocked! : 1,
    levels,
    dailyStreak: Number.isInteger(data.dailyStreak) && data.dailyStreak! >= 0 ? data.dailyStreak! : 0,
    lastDailyDate: typeof data.lastDailyDate === 'string' ? data.lastDailyDate : null,
  };
}

export async function loadProgress(): Promise<Progress> {
  try {
    return parseProgress(await AsyncStorage.getItem(KEY));
  } catch {
    return emptyProgress();
  }
}

// Serializes read-modify-write cycles so two quick saves can't read the same snapshot and
// clobber each other's change.
let writeQueue: Promise<unknown> = Promise.resolve();

function update<T>(change: (p: Progress) => T): Promise<T> {
  const run = writeQueue.then(async () => {
    const progress = await loadProgress();
    const result = change(progress);
    try {
      await AsyncStorage.setItem(KEY, JSON.stringify(progress));
    } catch {
      // Local-only storage: if a write fails there's nowhere else to put it; keep playing.
    }
    return result;
  });
  writeQueue = run.catch(() => undefined);
  return run;
}

export function recordLevelComplete(levelId: number, timeMs: number, stars: Stars): Promise<LevelRecord> {
  return update((p) => {
    const prev = p.levels[levelId];
    const record: LevelRecord = {
      bestTimeMs: prev ? Math.min(prev.bestTimeMs, timeMs) : timeMs,
      stars: prev ? (Math.max(prev.stars, stars) as Stars) : stars,
    };
    p.levels[levelId] = record;
    p.highestUnlocked = Math.max(p.highestUnlocked, levelId + 1);
    return record;
  });
}

function yesterdayKey(today: Date): string {
  const d = new Date(today);
  d.setDate(d.getDate() - 1);
  return dateKey(d);
}

// A streak only counts while it's alive: last played today or yesterday. Older than that, it's
// already broken even though the stored number hasn't been reset yet.
export function dailyStatus(p: Progress, today: Date): { streak: number; completedToday: boolean } {
  const completedToday = p.lastDailyDate === dateKey(today);
  const alive = completedToday || p.lastDailyDate === yesterdayKey(today);
  return { streak: alive ? p.dailyStreak : 0, completedToday };
}

export function recordDailyComplete(today: Date): Promise<{ streak: number }> {
  return update((p) => {
    const key = dateKey(today);
    if (p.lastDailyDate !== key) {
      p.dailyStreak = p.lastDailyDate === yesterdayKey(today) ? p.dailyStreak + 1 : 1;
      p.lastDailyDate = key;
    }
    return { streak: p.dailyStreak };
  });
}
