import { describe, expect, it } from '@jest/globals';
import { claimDaily, dailyReward, dailyStatus, dayKey } from '../src/game/daily';
import { saveWith } from './helpers';

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h);

describe('daily reward', () => {
  it('first claim starts a streak and can only be claimed once a day', () => {
    const now = at(2026, 6, 10);
    const claimed = claimDaily(saveWith({ wallet: 5 }), now)!;
    expect(claimed.streak).toBe(1);
    expect(claimed.wallet).toBe(5 + dailyReward(1));
    expect(claimed.lastDaily).toBe(dayKey(now));
    expect(dailyStatus(claimed, at(2026, 6, 10, 23)).available).toBe(false);
    expect(claimDaily(claimed, at(2026, 6, 10, 23))).toBeNull();
  });

  it('continues the streak on consecutive days and resets after a gap', () => {
    const s = saveWith({ lastDaily: dayKey(at(2026, 6, 10)), streak: 3 });
    expect(dailyStatus(s, at(2026, 6, 11)).streak).toBe(4);
    expect(dailyStatus(s, at(2026, 6, 12)).streak).toBe(1);
  });

  it('handles month boundaries and daylight-saving days by calendar date', () => {
    const feb = saveWith({ lastDaily: dayKey(at(2026, 2, 28)), streak: 2 });
    expect(dailyStatus(feb, at(2026, 3, 1, 0)).streak).toBe(3);
    const dst = saveWith({ lastDaily: dayKey(at(2026, 3, 8)), streak: 5 });
    expect(dailyStatus(dst, new Date(2026, 2, 9, 0, 30)).streak).toBe(6);
    const fallBack = saveWith({ lastDaily: dayKey(at(2026, 11, 1)), streak: 1 });
    expect(dailyStatus(fallBack, new Date(2026, 10, 2, 23, 30)).streak).toBe(2);
  });

  it('caps the reward growth at a 7-day streak', () => {
    expect(dailyReward(7)).toBe(dailyReward(30));
    expect(dailyReward(2)).toBeGreaterThan(dailyReward(1));
  });
});
