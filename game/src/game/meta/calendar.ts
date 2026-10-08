export const addDays = (d: Date, days: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);

export const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

export const yesterdayKey = (d: Date) => dayKey(addDays(d, -1));

export function timeLeftToday(now: Date) {
  const mins = Math.max(0, Math.ceil((addDays(now, 1).getTime() - now.getTime()) / 60000));
  const h = Math.floor(mins / 60);
  return h > 0 ? `${h}h ${mins % 60}m` : `${mins}m`;
}
