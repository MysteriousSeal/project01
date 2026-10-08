import { describe, expect, it } from '@jest/globals';
import { attemptsLeft, CHALLENGE_ATTEMPTS, challengeSeed, currentChallenges, emptyChallenges, medalFor, medalsOf, medalStreak, nextMedal, recordChallenge, resetAttempts, slotOf, startChallenge, streakBonus, type DailyChallenges } from '../../src/game/meta/challenge';
import { CHALLENGE_TYPES, CHALLENGES_PER_DAY, challengeTypeById, challengeTypesFor } from '../../src/game/meta/challengeTypes';
import { trackBest } from '../../src/game/sim/ghost';
import { day, MONDAY, result } from '../helpers';

const classic = challengeTypeById('classic');
const M = medalsOf(classic);
const big = () => result({ score: 999, coins: 999 });

describe('daily challenges', () => {
  it('offers three distinct challenges per day, every type three times a week', () => {
    const week = Array.from({ length: 7 }, (_, i) => challengeTypesFor(day(MONDAY + i)).map((t) => t.id));
    for (const ids of week) expect(new Set(ids).size).toBe(CHALLENGES_PER_DAY);
    const counts = new Map<string, number>();
    week.flat().forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1));
    expect([...counts.values()]).toEqual(CHALLENGE_TYPES.map(() => 3));
    expect(currentChallenges(emptyChallenges(), day(MONDAY)).slots.map((x) => x.type)).toEqual(['classic', 'perfect', 'coins']);
    for (const t of CHALLENGE_TYPES) {
      expect(t.targets[0]).toBeLessThan(t.targets[1]);
      expect(t.targets[1]).toBeLessThan(t.targets[2]);
    }
  });

  it('awards medals by the type thresholds', () => {
    expect(medalFor(0, classic)).toBe(0);
    expect(medalFor(M[0].score, classic)).toBe(1);
    expect(medalFor(M[2].score + 100, classic)).toBe(3);
    expect(nextMedal(M[0].score, classic)?.name).toBe('Silver');
    expect(nextMedal(999, classic)).toBeUndefined();
  });

  it('tracks attempts per challenge and resets the next day', () => {
    let c = emptyChallenges();
    for (let i = 0; i < CHALLENGE_ATTEMPTS; i++) c = startChallenge(c, 'classic', day(MONDAY))!;
    expect(attemptsLeft(slotOf(c, 'classic')!)).toBe(0);
    expect(attemptsLeft(slotOf(c, 'perfect')!)).toBe(CHALLENGE_ATTEMPTS);
    expect(startChallenge(c, 'classic', day(MONDAY, 23))).toBeNull();
    expect(startChallenge(c, 'perfect', day(MONDAY, 23))).not.toBeNull();
    expect(startChallenge(c, 'fragile', day(MONDAY))).toBeNull();
    const tomorrow = currentChallenges(c, day(MONDAY + 1));
    expect(tomorrow.slots.every((x) => attemptsLeft(x) === CHALLENGE_ATTEMPTS && x.best === 0)).toBe(true);
  });

  it('gives each challenge its own seed', () => {
    expect(challengeSeed('2026-6-8', 'classic')).toBe(challengeSeed('2026-6-8', 'classic'));
    expect(challengeSeed('2026-6-8', 'classic')).not.toBe(challengeSeed('2026-6-8', 'coins'));
    expect(challengeSeed('2026-6-8', 'classic')).not.toBe(challengeSeed('2026-6-9', 'classic'));
  });

  it('pays only newly reached medal tiers and keeps the best ghost', () => {
    const d = day(MONDAY);
    let c = startChallenge(emptyChallenges(), 'classic', d)!;
    const first = recordChallenge(c, 'classic', result({ score: M[0].score, planets: 8, landings: [[1, 8]] }), d)!;
    expect(first.outcome.newMedals.map((m) => m.name)).toEqual(['Bronze']);
    expect(first.outcome.reward).toBe(M[0].reward + streakBonus(1));
    c = startChallenge(first.challenges, 'classic', d)!;
    const second = recordChallenge(c, 'classic', result({ score: M[2].score, planets: 20, landings: [[2, 20]] }), d)!;
    expect(second.outcome.newMedals.map((m) => m.name)).toEqual(['Silver', 'Gold']);
    expect(second.outcome.reward).toBe(M[1].reward + M[2].reward);
    expect(trackBest(slotOf(second.challenges, 'classic')!.ghost)).toBe(20);
    c = startChallenge(second.challenges, 'classic', d)!;
    const third = recordChallenge(c, 'classic', result({ score: 3, planets: 2, landings: [[1, 2]] }), d)!;
    expect(third.outcome.reward).toBe(0);
    expect(slotOf(third.challenges, 'classic')!.best).toBe(M[2].score);
    expect(trackBest(slotOf(third.challenges, 'classic')!.ghost)).toBe(20);
    expect(third.outcome.attemptsLeft).toBe(0);
    expect(slotOf(third.challenges, 'perfect')!.medal).toBe(0);
  });

  it('scores Coin Hunt by coins instead of points', () => {
    const d = day(MONDAY);
    const t = challengeTypeById('coins');
    const c = startChallenge(emptyChallenges(), 'coins', d)!;
    const { outcome } = recordChallenge(c, 'coins', result({ score: 999, coins: t.targets[0] }), d)!;
    expect(outcome.medal).toBe(1);
    expect(outcome.value).toBe(t.targets[0]);
  });

  it('counts the medal streak once per day across all challenges', () => {
    const medalOn = (c: DailyChallenges, d: number, i = 0) => {
      const type = challengeTypesFor(day(d))[i].id;
      return recordChallenge(startChallenge(c, type, day(d))!, type, big(), day(d))!;
    };
    const d1 = medalOn(emptyChallenges(), 10);
    const d1b = medalOn(d1.challenges, 10, 1);
    expect(d1b.outcome.streak).toBe(1);
    expect(d1b.outcome.reward).toBe(medalsOf(challengeTypesFor(day(10))[1]).reduce((a, m) => a + m.reward, 0));
    const d2 = medalOn(d1b.challenges, 11);
    expect(d2.outcome.streak).toBe(2);
    expect(medalStreak(d2.challenges, day(12))).toBe(2);
    expect(medalStreak(d2.challenges, day(14))).toBe(0);
    expect(medalOn(d2.challenges, 14).outcome.streak).toBe(1);
  });
});

describe('resetAttempts', () => {
  it('gives back every attempt for today and keeps results', () => {
    const d = day(MONDAY);
    let c = emptyChallenges();
    for (const t of challengeTypesFor(d)) for (let i = 0; i < CHALLENGE_ATTEMPTS; i++) c = startChallenge(c, t.id, d)!;
    const [first] = challengeTypesFor(d);
    c = recordChallenge(c, first.id, result({ score: 999, coins: 999, planets: 30, landings: [[1, 30]] }), d)!.challenges;
    const reset = resetAttempts(c, d);
    expect(reset.slots.every((s) => attemptsLeft(s) === CHALLENGE_ATTEMPTS)).toBe(true);
    expect(slotOf(reset, first.id)).toMatchObject({ medal: 3, best: slotOf(c, first.id)!.best });
    expect(reset.streak).toBe(c.streak);
  });

  it('starts a fresh day when the stored challenges are from yesterday', () => {
    const old = startChallenge(emptyChallenges(), challengeTypesFor(day(MONDAY))[0].id, day(MONDAY))!;
    const reset = resetAttempts(old, day(MONDAY + 1));
    expect(reset.day).not.toBe(old.day);
    expect(reset.slots.every((s) => s.attempts === 0 && s.best === 0)).toBe(true);
  });
});
