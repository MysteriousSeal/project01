export const addDays = (d: Date, days: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);

export const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

export const yesterdayKey = (d: Date) => dayKey(addDays(d, -1));

export const msUntilTomorrow = (now: Date) => Math.max(0, addDays(now, 1).getTime() - now.getTime());

export function countdownToTomorrow(now: Date) {
  const total = Math.ceil(msUntilTomorrow(now) / 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
}
