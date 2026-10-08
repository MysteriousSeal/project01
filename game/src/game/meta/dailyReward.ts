import { dayKey, yesterdayKey } from './calendar';
import type { Save } from './save';

const MAX_STREAK_BONUS_DAYS = 7;

export const dailyReward = (streak: number) => 15 + Math.min(streak, MAX_STREAK_BONUS_DAYS) * 10;

/** Largest single daily reward; the server flags anything above it. */
export const DAILY_REWARD_MAX = dailyReward(MAX_STREAK_BONUS_DAYS);

export function dailyStatus(save: Save, now: Date = new Date()) {
  const today = dayKey(now);
  const streak = save.lastDaily === yesterdayKey(now) ? save.streak + 1 : 1;
  return { available: save.lastDaily !== today, streak, reward: dailyReward(streak), today };
}

export function claimDaily(save: Save, now: Date = new Date()): Save | null {
  const d = dailyStatus(save, now);
  if (!d.available) return null;
  return { ...save, lastDaily: d.today, streak: d.streak, wallet: save.wallet + d.reward };
}
