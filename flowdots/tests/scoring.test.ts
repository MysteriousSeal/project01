import { formatClock, parTimeMs, starsForTime } from '../src/game/scoring';
import { makeLevel, p } from './helpers';

const level = makeLevel(5, [[p(0, 0), p(0, 1)]]);

describe('scoring', () => {
  test('par scales with board area', () => {
    expect(parTimeMs(makeLevel(10, []))).toBe(4 * parTimeMs(level));
  });

  test('stars step down at par and at the 2-star limit', () => {
    const par = parTimeMs(level);
    expect(starsForTime(level, par)).toBe(3);
    expect(starsForTime(level, par + 1)).toBe(2);
    expect(starsForTime(level, par * 1.8)).toBe(2);
    expect(starsForTime(level, par * 1.8 + 1)).toBe(1);
  });

  test('formatClock renders m:ss', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(9_999)).toBe('0:09');
    expect(formatClock(125_000)).toBe('2:05');
    expect(formatClock(-50)).toBe('0:00');
  });
});
