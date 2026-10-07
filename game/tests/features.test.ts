import { describe, expect, it } from '@jest/globals';
import { attemptsLeft, CHALLENGE_ATTEMPTS, challengeSeed, currentChallenges, DailyChallenges, emptyChallenges, MEDAL_TIERS, medalFor, medalsOf, medalStreak, nextMedal, recordChallenge, slotOf, startChallenge, streakBonus } from '../src/game/challenge';
import { CHALLENGE_TYPES, CHALLENGES_PER_DAY, challengeTypeById, challengeTypesFor } from '../src/game/challengeTypes';
import { dayKey } from '../src/game/daily';
import { createState, isBossIndex, planetOf, RunResult, runResult, State, step, TUNING, WORLD } from '../src/game/engine';
import { parseTrack, Track, TRACK_END, trackBest } from '../src/game/ghost';
import { applyRun } from '../src/game/progress';
import { seededRng } from '../src/game/rng';
import { defaultSave, normalizeSave } from '../src/game/save';
import { DT, FROM_BELOW, H, hop, newGame, runFor, saveWith, W } from './helpers';

const drain = (s: State) => {
  const out = [...s.events];
  s.events.length = 0;
  return out;
};
const hopTo = (s: State, idx: number) => {
  while (s.cur < idx - 1) hop(s);
};
const run = (patch: Partial<RunResult> = {}): RunResult => ({ score: 0, coins: 0, perfects: 0, bestCombo: 0, planets: 0, landings: [], ...patch });
const day = (d: number, h = 12) => new Date(2026, 5, d, h);

describe('boss planets', () => {
  it('appears every bossEvery planets, centered and guarded by a ring', () => {
    const s = newGame(2);
    hopTo(s, WORLD.bossEvery);
    const boss = planetOf(s, WORLD.bossEvery);
    expect(isBossIndex(WORLD.bossEvery)).toBe(true);
    expect(isBossIndex(WORLD.bossEvery - 1)).toBe(false);
    expect(boss.boss && boss.ring).toBe(true);
    expect(boss.x).toBe(W / 2);
    expect(boss.r).toBe(WORLD.bossRadius);
    expect(boss.moveAmp).toBe(0);
  });

  it('gives the planet before a boss extra time to line up the gap', () => {
    const s = newGame(2);
    hopTo(s, WORLD.bossEvery - 1);
    const pre = planetOf(s, WORLD.bossEvery - 1);
    const normal = planetOf(s, WORLD.bossEvery - 2);
    expect(pre.fuseMax).toBeGreaterThan(normal.fuseMax + WORLD.preBossBreather - 0.2);
  });

  it('rotates its gap over time', () => {
    const s = newGame(2);
    hopTo(s, WORLD.bossEvery);
    const boss = planetOf(s, WORLD.bossEvery);
    const before = boss.gapAngle;
    step(s, 0.5);
    expect(boss.gapAngle).not.toBeCloseTo(before);
  });

  it('clears through the gap: bonus score, coins, slow motion', () => {
    const s = newGame(2);
    hopTo(s, WORLD.bossEvery);
    drain(s);
    const { score, coinsRun } = s;
    hop(s);
    expect(s.cur).toBe(WORLD.bossEvery);
    expect(drain(s)).toContain('boss');
    expect(s.score).toBeGreaterThanOrEqual(score + TUNING.bossBonus + 1);
    expect(s.coinsRun).toBeGreaterThanOrEqual(coinsRun + TUNING.bossCoins);
    expect(planetOf(s, WORLD.bossEvery).ring).toBe(false);
    expect(s.slowmo).toBeGreaterThan(0);
    const t = s.t;
    step(s, 0.1);
    expect(s.t - t).toBeCloseTo(0.1 * TUNING.slowmoScale);
  });

  it('blocks entry outside the gap, unless a shield saves the run', () => {
    const blocked = newGame(2);
    hopTo(blocked, WORLD.bossEvery);
    planetOf(blocked, WORLD.bossEvery).gapAngle = -FROM_BELOW;
    hop(blocked, 0, false);
    expect(blocked.dead).toBe(true);
    expect(blocked.deathReason).toBe('lost');

    const shielded = newGame(2);
    hopTo(shielded, WORLD.bossEvery);
    shielded.shield = true;
    planetOf(shielded, WORLD.bossEvery).gapAngle = -FROM_BELOW;
    hop(shielded, 0, false);
    expect(shielded.dead).toBe(false);
    expect(shielded.cur).toBe(WORLD.bossEvery - 1);
    expect(drain(shielded)).toContain('saved');
  });
});

describe('ghost', () => {
  it('records landings and a final death marker', () => {
    const s = newGame();
    hop(s);
    hop(s);
    runFor(s, 10);
    const r = runResult(s);
    expect(r.landings.map(([, idx]) => idx)).toEqual([1, 2, TRACK_END]);
    expect(r.landings.every(([t], i, a) => i === 0 || t >= a[i - 1][0])).toBe(true);
    expect(trackBest(r.landings)).toBe(2);
  });

  it('follows the recorded track over time and finishes', () => {
    const ghost: Track = [[0.2, 1], [0.4, 2], [0.6, 3], [5, TRACK_END]];
    const s = newGame(1, { ghost });
    runFor(s, 0.3);
    expect(s.ghostIdx).toBe(1);
    runFor(s, 0.35);
    expect(s.ghostIdx).toBe(3);
    expect(s.ghostDone).toBe(false);
    s.planets.forEach((p) => (p.fuse = p.fuseMax = 99));
    runFor(s, 5);
    expect(s.ghostDone).toBe(true);
  });

  it('announces overtaking the ghost only after it was ahead', () => {
    const s = newGame(1, { ghost: [[0.05, 1], [60, 2], [61, TRACK_END]] });
    runFor(s, 0.1);
    expect(s.ghostAhead).toBe(true);
    hop(s);
    expect(drain(s)).not.toContain('ghost');
    hop(s);
    expect(drain(s)).toContain('ghost');
    hop(s);
    expect(drain(s)).not.toContain('ghost');
  });

  it('parses stored tracks defensively', () => {
    expect(parseTrack('x')).toEqual([]);
    expect(parseTrack([[0.1, 1], [0.05, 2], ['a', 3], [0.3, 1.5], [0.4, -2], [0.5, TRACK_END], [0.6]])).toEqual([[0.1, 1], [0.5, TRACK_END]]);
  });
});

describe('fair seeded worlds', () => {
  it('builds the same world for the same seed regardless of visual effects', () => {
    const play = (fxSeed: number) => {
      const s = createState(W, H, { rng: seededRng(99), fx: seededRng(fxSeed) });
      for (let i = 0; i < 30; i++) hop(s);
      return s.planets.map((p) => [p.idx, Math.round(p.baseX), Math.round(p.y), p.gold]);
    };
    expect(play(1)).toEqual(play(2));
  });
});

const MONDAY = 8;
const classic = challengeTypeById('classic');
const M = medalsOf(classic);
const big = () => run({ score: 999, coins: 999 });

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
    const first = recordChallenge(c, 'classic', run({ score: M[0].score, planets: 8, landings: [[1, 8]] }), d)!;
    expect(first.outcome.newMedals.map((m) => m.name)).toEqual(['Bronze']);
    expect(first.outcome.reward).toBe(M[0].reward + streakBonus(1));
    c = startChallenge(first.challenges, 'classic', d)!;
    const second = recordChallenge(c, 'classic', run({ score: M[2].score, planets: 20, landings: [[2, 20]] }), d)!;
    expect(second.outcome.newMedals.map((m) => m.name)).toEqual(['Silver', 'Gold']);
    expect(second.outcome.reward).toBe(M[1].reward + M[2].reward);
    expect(trackBest(slotOf(second.challenges, 'classic')!.ghost)).toBe(20);
    c = startChallenge(second.challenges, 'classic', d)!;
    const third = recordChallenge(c, 'classic', run({ score: 3, planets: 2, landings: [[1, 2]] }), d)!;
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
    const { outcome } = recordChallenge(c, 'coins', run({ score: 999, coins: t.targets[0] }), d)!;
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

describe('challenge rules', () => {
  const play = (id: string, seed = 5) => newGame(seed, { rules: challengeTypeById(id).rules });

  it('Boss Rush puts a boss every 6 planets', () => {
    const s = play('bossRush');
    hopTo(s, 6);
    expect(planetOf(s, 6).boss).toBe(true);
    expect(planetOf(s, 5).boss).toBe(false);
  });

  it('Perfectionist ends the run on a non-perfect landing', () => {
    const s = play('perfect');
    hop(s);
    expect(s.dead).toBe(false);
    hop(s, planetOf(s, 2).r * 0.9);
    expect(s.dead).toBe(true);
  });

  it('Speed Run shortens planet fuses', () => {
    const fast = play('speed', 3);
    const normal = newGame(3);
    expect(planetOf(fast, 2).fuseMax).toBeLessThan(planetOf(normal, 2).fuseMax);
  });

  it('Fever Day triggers fever after 3 perfects and makes it last longer', () => {
    const s = play('fever');
    hop(s);
    hop(s);
    hop(s);
    expect(s.fever).toBeGreaterThan(s.mods.feverTime);
  });

  it('Fragile has no power-ups and moving planets early', () => {
    const s = play('fragile', 9);
    expect(s.planets.some((p) => p.idx > 0 && p.idx < 13 && p.moveAmp > 0)).toBe(true);
    for (let i = 0; i < 20; i++) hop(s);
    expect(s.powerups).toHaveLength(0);
    expect(s.shield).toBe(false);
  });

  it('Coin Hunt places a coin before every planet', () => {
    const s = play('coins');
    const ahead = s.planets.filter((p) => p.idx > 0 && p.idx <= 4).length;
    expect(s.coins.length).toBeGreaterThanOrEqual(ahead);
  });
});

describe('run modes', () => {
  it('normal runs store the ghost when beating the best planet', () => {
    const landings: Track = [[1, 1], [2, 2], [3, TRACK_END]];
    const rep = applyRun(saveWith({ bestPlanet: 1 }), run({ score: 3, planets: 2, landings }), { rng: seededRng(1) });
    expect(rep.save.ghost).toEqual(landings);
    const worse = applyRun(rep.save, run({ score: 1, planets: 1, landings: [[1, 1]] }), { rng: seededRng(1) });
    expect(worse.save.ghost).toEqual(landings);
  });

  it('records a ghost whenever a run beats the current ghost, even below an old record', () => {
    const landings: Track = [[1, 1], [2, 2], [3, 3], [4, TRACK_END]];
    const veteran = saveWith({ best: 80, bestPlanet: 40, ghost: [] });
    const rep = applyRun(veteran, run({ score: 4, planets: 3, landings }), { rng: seededRng(1) });
    expect(rep.save.ghost).toEqual(landings);
    expect(rep.save.bestPlanet).toBe(40);
  });

  it('keeps the ghost setting off by default and validates it', () => {
    expect(defaultSave().settings.ghost).toBe(false);
    expect(normalizeSave({}).settings.ghost).toBe(false);
    expect(normalizeSave({ settings: { ghost: 'yes' } }).settings.ghost).toBe(false);
    expect(normalizeSave({ settings: { ghost: true } }).settings.ghost).toBe(true);
  });

  it('daily runs pay medals but leave normal records alone', () => {
    const now = day(MONDAY);
    const save = saveWith({ best: 5, bestPlanet: 3, wallet: 0, challenges: startChallenge(emptyChallenges(), 'classic', now)! });
    const rep = applyRun(save, run({ score: 40, coins: 2, planets: 15 }), { mode: 'daily', challenge: 'classic', rng: seededRng(1), now });
    expect(rep.save.best).toBe(5);
    expect(rep.save.bestPlanet).toBe(3);
    expect(rep.newBest).toBe(false);
    expect(rep.challenge?.medal).toBe(2);
    expect(slotOf(rep.save.challenges, 'classic')!.best).toBe(40);
    expect(rep.save.wallet).toBe(2 + rep.levelReward + M[0].reward + M[1].reward + streakBonus(1) + rep.completed.reduce((a, m) => a + m.reward, 0));
  });

  it('save data keeps ghost and challenges across a round trip, and migrates the old format', () => {
    const now = day(MONDAY);
    const challenges = startChallenge(emptyChallenges(), 'classic', now)!;
    const s = saveWith({ ghost: [[1, 1], [2, TRACK_END]], challenges: { ...challenges, slots: challenges.slots.map((x) => (x.type === 'classic' ? { ...x, best: 22, medal: 1, ghost: [[1, 3]] } : x)), streak: 2, lastMedalDay: dayKey(now) } });
    expect(normalizeSave(JSON.parse(JSON.stringify(s)))).toEqual(s);
    const bad = normalizeSave({ challenges: { day: 'x', slots: [{ type: 'classic', attempts: 99, medal: 9 }, { type: 'nope' }, { type: 'classic' }] } }).challenges;
    expect(bad.slots).toHaveLength(1);
    expect(bad.slots[0]).toMatchObject({ attempts: CHALLENGE_ATTEMPTS, medal: MEDAL_TIERS.length });
    expect(normalizeSave({ challenge: { day: '2026-6-1', attempts: 2, streak: 4, lastMedalDay: '2026-6-1' } }).challenges).toEqual({ day: '', slots: [], streak: 4, lastMedalDay: '2026-6-1' });
  });
});

it('engine steps stay stable under slow motion', () => {
  const s = newGame();
  s.slowmo = 1;
  for (let i = 0; i < 100; i++) step(s, DT);
  expect(s.slowmo).toBeCloseTo(1 - 100 * DT, 5);
});
