import { describe, expect, it } from '@jest/globals';
import { dayKey } from '../../src/game/meta/calendar';
import { CHALLENGE_ATTEMPTS, emptyChallenges, MEDAL_TIERS, startChallenge } from '../../src/game/meta/challenge';
import { nextSkin, SKINS } from '../../src/game/meta/cosmetics';
import { defaultSave, normalizeSave } from '../../src/game/meta/save';
import { TRACK_END } from '../../src/game/sim/ghost';
import { day, MONDAY, saveWith } from '../helpers';

describe('normalizeSave', () => {
  it('returns defaults for missing or invalid input', () => {
    expect(normalizeSave(null)).toEqual(defaultSave());
    expect(normalizeSave('garbage')).toEqual(defaultSave());
    expect(normalizeSave(42)).toEqual(defaultSave());
  });

  it('round-trips a valid save unchanged', () => {
    const s = saveWith({ best: 12, wallet: 340, skins: ['classic', 'ember'], skin: 'ember', trails: ['classic', 'comet'], trail: 'comet', upgrades: { sturdy: 2 }, lastDaily: '2026-6-10', streak: 3 });
    expect(normalizeSave(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });

  it('migrates the legacy owned field to skins', () => {
    const s = normalizeSave({ owned: ['classic', 'mint'], skin: 'mint', wallet: 10 });
    expect(s.skins).toEqual(['classic', 'mint']);
    expect(s.skin).toBe('mint');
    expect(s.trails).toEqual(['classic']);
  });

  it('sanitizes numbers, ids, upgrades and missions', () => {
    const s = normalizeSave({
      best: -5,
      wallet: Number.NaN,
      xp: '120',
      games: 3.7,
      skins: ['ember', 'not-a-skin', 7],
      skin: 'gold',
      trail: 'rainbow',
      upgrades: { sturdy: 99, magnet: -1, hacked: 5 },
      missions: [
        { id: 'ok', kind: 'score', target: 10, progress: 50, reward: 20 },
        { id: 'bad-kind', kind: 'fly', target: 10, progress: 0, reward: 1 },
        { kind: 'coins', target: 5 },
        null,
      ],
    });
    expect(s.best).toBe(0);
    expect(s.wallet).toBe(0);
    expect(s.xp).toBe(0);
    expect(s.games).toBe(3);
    expect(s.skins).toEqual(['classic', 'ember']);
    expect(s.skin).toBe('classic');
    expect(s.trail).toBe('classic');
    expect(s.upgrades).toEqual({ sturdy: 4 });
    expect(s.missions).toEqual([{ id: 'ok', kind: 'score', target: 10, progress: 10, reward: 20 }]);
  });
});

describe('nextSkin', () => {
  it('suggests the cheapest skin not owned yet', () => {
    expect(nextSkin(defaultSave())?.id).toBe('ember');
    expect(nextSkin(saveWith({ skins: SKINS.map((s) => s.id) }))).toBeUndefined();
  });
});

describe('ghost and challenge data', () => {
  it('keeps the ghost setting off by default and validates it', () => {
    expect(defaultSave().settings.ghost).toBe(false);
    expect(normalizeSave({}).settings.ghost).toBe(false);
    expect(normalizeSave({ settings: { ghost: 'yes' } }).settings.ghost).toBe(false);
    expect(normalizeSave({ settings: { ghost: true } }).settings.ghost).toBe(true);
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
