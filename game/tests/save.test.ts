import { describe, expect, it } from '@jest/globals';
import { nextSkin, SKINS } from '../src/game/cosmetics';
import { defaultSave, normalizeSave } from '../src/game/save';
import { saveWith } from './helpers';

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
