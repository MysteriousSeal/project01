import { describe, expect, it } from '@jest/globals';
import { addDays, dayKey, yesterdayKey } from '../../src/game/meta/calendar';
import { modsFrom } from '../../src/game/meta/upgrades';
import { alpha } from '../../src/game/palette';
import { DEFAULT_MODS } from '../../src/game/sim/engine';

describe('calendar', () => {
  it('formats local calendar days', () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-1-5');
  });

  it('adds days across month, year and daylight-saving boundaries', () => {
    expect(dayKey(addDays(new Date(2026, 0, 31), 1))).toBe('2026-2-1');
    expect(dayKey(addDays(new Date(2026, 11, 31), 1))).toBe('2027-1-1');
    expect(dayKey(addDays(new Date(2026, 2, 1), -1))).toBe('2026-2-28');
    expect(dayKey(addDays(new Date(2026, 2, 9, 0, 30), -1))).toBe('2026-3-8');
    expect(dayKey(addDays(new Date(2026, 10, 1, 23, 30), 1))).toBe('2026-11-2');
  });

  it('computes yesterday from the calendar, not 24 hours', () => {
    expect(yesterdayKey(new Date(2028, 2, 1, 0, 15))).toBe('2028-2-29');
  });
});

describe('shared constants', () => {
  it('zero upgrades equal the base run modifiers', () => {
    expect(modsFrom({})).toEqual(DEFAULT_MODS);
  });

  it('builds hex colors with alpha', () => {
    expect(alpha('#ffffff', 0)).toBe('#ffffff00');
    expect(alpha('#ffd34d', 1)).toBe('#ffd34dff');
    expect(alpha('#0b1026', 0.5)).toBe('#0b102680');
    expect(alpha('#0b102633', 2)).toBe('#0b1026ff');
  });
});
