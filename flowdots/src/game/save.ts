import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'flowdots.progress';

export type LevelRecord = { bestTimeMs: number; stars: 1 | 2 | 3 };
export type Progress = {
  highestUnlocked: number;
  levels: Record<number, LevelRecord>;
  dailyStreak: number;
  lastDailyDate: string | null; // yyyy-m-d of the last completed daily challenge
};

const DEFAULT_PROGRESS: Progress = {
  highestUnlocked: 1,
  levels: {},
  dailyStreak: 0,
  lastDailyDate: null,
};

async function loadProgress(): Promise<Progress> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? { ...DEFAULT_PROGRESS, ...JSON.parse(raw) } : { ...DEFAULT_PROGRESS };
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

async function saveProgress(p: Progress): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // Offline local storage only; if it fails there's nowhere else to persist to.
  }
}

export async function loadHighestUnlocked(): Promise<number> {
  return (await loadProgress()).highestUnlocked;
}

export async function getLevelRecords(): Promise<Record<number, LevelRecord>> {
  return (await loadProgress()).levels;
}

export async function recordLevelComplete(
  levelId: number,
  timeMs: number,
  stars: 1 | 2 | 3,
): Promise<LevelRecord> {
  const p = await loadProgress();
  const prev = p.levels[levelId];
  const record: LevelRecord = {
    bestTimeMs: Math.min(prev?.bestTimeMs ?? Infinity, timeMs),
    stars: Math.max(prev?.stars ?? 0, stars) as 1 | 2 | 3,
  };
  p.levels[levelId] = record;
  if (levelId + 1 > p.highestUnlocked) p.highestUnlocked = levelId + 1;
  await saveProgress(p);
  return record;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export async function getDailyStatus(): Promise<{ streak: number; completedToday: boolean }> {
  const p = await loadProgress();
  return { streak: p.dailyStreak, completedToday: p.lastDailyDate === dateKey(new Date()) };
}

export async function recordDailyComplete(): Promise<{ streak: number }> {
  const p = await loadProgress();
  const today = dateKey(new Date());
  if (p.lastDailyDate === today) return { streak: p.dailyStreak };

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const continuesStreak = p.lastDailyDate === dateKey(yesterday);

  p.dailyStreak = continuesStreak ? p.dailyStreak + 1 : 1;
  p.lastDailyDate = today;
  await saveProgress(p);
  return { streak: p.dailyStreak };
}
