import type { Save } from './save';

export const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

const yesterdayOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);

export const dailyReward = (streak: number) => 15 + Math.min(streak, 7) * 10;

export function dailyStatus(save: Save, now: Date = new Date()) {
  const today = dayKey(now);
  const streak = save.lastDaily === dayKey(yesterdayOf(now)) ? save.streak + 1 : 1;
  return { available: save.lastDaily !== today, streak, reward: dailyReward(streak), today };
}

export function claimDaily(save: Save, now: Date = new Date()): Save | null {
  const d = dailyStatus(save, now);
  if (!d.available) return null;
  return { ...save, lastDaily: d.today, streak: d.streak, wallet: save.wallet + d.reward };
}
