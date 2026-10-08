import { ChallengeType, challengeTypeById, challengeTypesFor } from './challengeTypes';
import { dayKey, yesterdayKey } from './calendar';
import type { RunResult } from '../sim/engine';
import { Track, trackBest } from '../sim/ghost';
import { C } from '../palette';

export const CHALLENGE_ATTEMPTS = 3;

export const MEDAL_TIERS = [
  { name: 'Bronze', reward: 30, color: C.bronze },
  { name: 'Silver', reward: 60, color: C.silver },
  { name: 'Gold', reward: 120, color: C.gold },
] as const;

export type Medal = { name: string; score: number; reward: number; color: string };

export type ChallengeSlot = { type: string; attempts: number; best: number; medal: number; ghost: Track };

export type DailyChallenges = { day: string; slots: ChallengeSlot[]; streak: number; lastMedalDay: string };

const emptySlot = (type: string): ChallengeSlot => ({ type, attempts: 0, best: 0, medal: 0, ghost: [] });
export const emptyChallenges = (): DailyChallenges => ({ day: '', slots: [], streak: 0, lastMedalDay: '' });

export const medalsOf = (t: ChallengeType): Medal[] => MEDAL_TIERS.map((tier, i) => ({ ...tier, score: t.targets[i] }));
export const medalFor = (value: number, t: ChallengeType) => medalsOf(t).filter((m) => value >= m.score).length;
export const nextMedal = (value: number, t: ChallengeType) => medalsOf(t).find((m) => value < m.score);
export const statOf = (t: ChallengeType, r: Pick<RunResult, 'score' | 'coins'>) => (t.stat === 'coins' ? r.coins : r.score);
export const streakBonus = (streak: number) => 10 * (Math.min(streak, 7) - 1);
export const typeOf = (slot: ChallengeSlot) => challengeTypeById(slot.type);
export const attemptsLeft = (slot: ChallengeSlot) => Math.max(0, CHALLENGE_ATTEMPTS - slot.attempts);
export const isOpen = (slot: ChallengeSlot) => attemptsLeft(slot) > 0 && slot.medal < MEDAL_TIERS.length;

export function challengeSeed(day: string, type: string) {
  const key = `${day}:${type}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function currentChallenges(c: DailyChallenges, now: Date = new Date()): DailyChallenges {
  const today = dayKey(now);
  if (c.day === today) return c;
  return { day: today, slots: challengeTypesFor(now).map((t) => emptySlot(t.id)), streak: c.streak, lastMedalDay: c.lastMedalDay };
}

export const slotOf = (c: DailyChallenges, type: string) => c.slots.find((s) => s.type === type);

const withSlot = (c: DailyChallenges, slot: ChallengeSlot): DailyChallenges => ({ ...c, slots: c.slots.map((s) => (s.type === slot.type ? slot : s)) });

export function medalStreak(c: DailyChallenges, now: Date = new Date()) {
  return c.lastMedalDay === dayKey(now) || c.lastMedalDay === yesterdayKey(now) ? c.streak : 0;
}

export function startChallenge(c: DailyChallenges, type: string, now: Date = new Date()): DailyChallenges | null {
  const cur = currentChallenges(c, now);
  const slot = slotOf(cur, type);
  return slot && attemptsLeft(slot) > 0 ? withSlot(cur, { ...slot, attempts: slot.attempts + 1 }) : null;
}

export type ChallengeOutcome = { type: string; value: number; attempt: number; attemptsLeft: number; best: number; medal: number; newMedals: Medal[]; reward: number; streak: number };

export function recordChallenge(c: DailyChallenges, type: string, r: RunResult, now: Date = new Date()): { challenges: DailyChallenges; outcome: ChallengeOutcome } | null {
  const slot = slotOf(c, type);
  if (!slot) return null;
  const t = typeOf(slot);
  const value = statOf(t, r);
  const medal = Math.max(slot.medal, medalFor(value, t));
  const newMedals = medalsOf(t).slice(slot.medal, medal);
  let reward = newMedals.reduce((a, m) => a + m.reward, 0);
  let { streak, lastMedalDay } = c;
  if (newMedals.length && lastMedalDay !== c.day) {
    streak = lastMedalDay === yesterdayKey(now) ? streak + 1 : 1;
    lastMedalDay = c.day;
    reward += streakBonus(streak);
  }
  const next: ChallengeSlot = { ...slot, best: Math.max(slot.best, value), medal, ghost: r.planets > trackBest(slot.ghost) ? r.landings : slot.ghost };
  return {
    challenges: { ...withSlot(c, next), streak, lastMedalDay },
    outcome: { type, value, attempt: slot.attempts, attemptsLeft: attemptsLeft(slot), best: next.best, medal, newMedals, reward, streak },
  };
}
