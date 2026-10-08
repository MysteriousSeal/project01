import { describe, expect, it } from '@jest/globals';
import { attemptsLeft, CHALLENGE_ATTEMPTS, challengeSeed, slotOf } from '../../src/game/meta/challenge';
import { challengeTypeById, challengeTypesFor } from '../../src/game/meta/challengeTypes';
import { retryMode, startRun, TUTORIAL_GAMES } from '../../src/game/meta/session';
import { modsFrom } from '../../src/game/meta/upgrades';
import { createState, DEFAULT_MODS, DEFAULT_RULES } from '../../src/game/sim/engine';
import { seededRng } from '../../src/game/sim/rng';
import { day, H, MONDAY, saveWith, W } from '../helpers';

const today = day(MONDAY);
const [first] = challengeTypesFor(today);

describe('startRun', () => {
  it('builds a normal run from upgrades, record and settings', () => {
    const save = saveWith({ upgrades: { sturdy: 2 }, bestPlanet: 12, games: 1, ghost: [[1, 1]], settings: { ghost: true, sound: true } });
    const started = startRun(save, 'normal', '', today)!;
    expect(started.save).toBe(save);
    expect(started.config).toEqual({ mode: 'normal', mods: modsFrom({ sturdy: 2 }), rules: DEFAULT_RULES, ghost: [[1, 1]], bestIdx: 12, headStart: 0, showHint: true });
  });

  it('hides the ghost and hint when they do not apply', () => {
    const save = saveWith({ ghost: [[1, 1]], games: TUTORIAL_GAMES });
    const { config } = startRun(save, 'normal', '', today)!;
    expect(config.ghost).toEqual([]);
    expect(config.showHint).toBe(false);
  });

  it('starts a daily challenge with fixed rules, no upgrades and a shared seed', () => {
    const save = saveWith({ upgrades: { sturdy: 4, shield: 1 }, bestPlanet: 30 });
    const started = startRun(save, 'daily', first.id, today)!;
    const slot = slotOf(started.save.challenges, first.id)!;
    expect(slot.attempts).toBe(1);
    expect(started.config.challenge?.id).toBe(first.id);
    expect(started.config.rules).toEqual(challengeTypeById(first.id).rules);
    expect(started.config.mods).toEqual(DEFAULT_MODS);
    expect(started.config.bestIdx).toBe(0);
    expect(started.config.seed).toBe(challengeSeed(started.save.challenges.day, first.id));
  });

  it('gives every player the same world for the same daily challenge', () => {
    const a = startRun(saveWith(), 'daily', first.id, today)!.config;
    const b = startRun(saveWith({ wallet: 500, xp: 9000 }), 'daily', first.id, today)!.config;
    const world = (seed: number) => createState(W, H, { rng: seededRng(seed), rules: a.rules }).planets.map((p) => [Math.round(p.x), Math.round(p.y)]);
    expect(world(a.seed!)).toEqual(world(b.seed!));
  });

  it('refuses unknown challenges and exhausted attempts', () => {
    expect(startRun(saveWith(), 'daily', 'fragile-nope', today)).toBeNull();
    let save = saveWith();
    for (let i = 0; i < CHALLENGE_ATTEMPTS; i++) save = startRun(save, 'daily', first.id, today)!.save;
    expect(attemptsLeft(slotOf(save.challenges, first.id)!)).toBe(0);
    expect(startRun(save, 'daily', first.id, today)).toBeNull();
  });

  it('uses the daily ghost only when the setting is on', () => {
    const base = startRun(saveWith(), 'daily', first.id, today)!.save;
    const withGhost = { ...base, challenges: { ...base.challenges, slots: base.challenges.slots.map((s) => (s.type === first.id ? { ...s, ghost: [[1, 3]] as [number, number][] } : s)) } };
    expect(startRun(withGhost, 'daily', first.id, today)!.config.ghost).toEqual([]);
    expect(startRun({ ...withGhost, settings: { ghost: true, sound: true } }, 'daily', first.id, today)!.config.ghost).toEqual([[1, 3]]);
  });
});

describe('retryMode', () => {
  it('retries the same challenge while attempts remain, then falls back to normal', () => {
    let save = saveWith();
    for (let i = 1; i <= CHALLENGE_ATTEMPTS; i++) {
      const started = startRun(save, 'daily', first.id, today)!;
      save = started.save;
      const expected = i < CHALLENGE_ATTEMPTS ? { mode: 'daily', type: first.id } : { mode: 'normal' };
      expect(retryMode(save, started.config, today)).toEqual(expected);
    }
  });

  it('always retries normal runs as normal runs', () => {
    const { save, config } = startRun(saveWith(), 'normal', '', today)!;
    expect(retryMode(save, config, today)).toEqual({ mode: 'normal' });
  });

  it('falls back to normal when the day rolled over', () => {
    const { save, config } = startRun(saveWith(), 'daily', first.id, today)!;
    const tomorrowTypes = challengeTypesFor(day(MONDAY + 1)).map((t) => t.id);
    const expected = tomorrowTypes.includes(first.id) ? { mode: 'daily', type: first.id } : { mode: 'normal' };
    expect(retryMode(save, config, day(MONDAY + 1))).toEqual(expected);
  });
});
