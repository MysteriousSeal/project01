import { describe, expect, it } from '@jest/globals';
import { botWantsTap } from '../../src/game/sim/bot';
import { createState, step, tap } from '../../src/game/sim/engine';
import { seededRng } from '../../src/game/sim/rng';
import { CHALLENGE_TYPES } from '../../src/game/meta/challengeTypes';
import { DEFAULT_RULES, Rules } from '../../src/game/sim/world';
import { autoplayConfig } from '../../src/game/meta/session';
import { modsFrom } from '../../src/game/meta/upgrades';
import { H, saveWith, W } from '../helpers';

function autoplay(seed: number, planets: number, rules: Rules = DEFAULT_RULES) {
  const s = createState(W, H, { rng: seededRng(seed), fx: seededRng(seed + 1), cometRng: seededRng(seed + 2), rules });
  for (let i = 0; i < 60 * 60 * 15 && !s.dead && s.cur < planets; i++) {
    if (botWantsTap(s)) tap(s);
    step(s, 1 / 60);
    s.events.length = 0;
  }
  return s;
}

describe('autoplay bot', () => {
  it('usually plays 150 planets, through moving planets and bosses', () => {
    const runs = Array.from({ length: 10 }, (_, i) => autoplay(i + 1, 150));
    expect(runs.filter((s) => s.cur === 150).length).toBeGreaterThanOrEqual(8);
    expect(runs.reduce((a, s) => a + s.bosses, 0)).toBeGreaterThanOrEqual(30);
  });

  it('lands most hops perfectly', () => {
    const runs = [1, 2, 3, 4].map((seed) => autoplay(seed, 120));
    const hops = runs.reduce((a, s) => a + s.cur, 0);
    expect(runs.reduce((a, s) => a + s.perfects, 0) / hops).toBeGreaterThan(0.85);
  });

  it('gets far under the daily challenge rules too', () => {
    for (const t of CHALLENGE_TYPES.filter((x) => !x.rules.perfectOnly)) {
      const best = Math.max(...[11, 12, 13].map((seed) => autoplay(seed, 60, t.rules).cur));
      expect(best).toBeGreaterThanOrEqual(40);
    }
  });

  it('never taps while flying or dead', () => {
    const s = autoplay(2, 5);
    s.flying = true;
    expect(botWantsTap(s)).toBe(false);
    s.flying = false;
    s.dead = true;
    expect(botWantsTap(s)).toBe(false);
  });
});

describe('autoplay runs', () => {
  it('use upgrades but no boosts, ghost or hints, and leave the save alone', () => {
    const save = saveWith({ boosts: { shield: 2, coins2x: 1 }, upgrades: { magnet: 2 }, ghost: [[1, 1]], settings: { ghost: true, sound: true }, bestPlanet: 40 });
    const before = JSON.stringify(save);
    const config = autoplayConfig(save);
    expect(config).toMatchObject({ mode: 'normal', ghost: [], headStart: 0, showHint: false, bestIdx: 40 });
    expect(config.mods).toEqual(modsFrom({ magnet: 2 }));
    expect(JSON.stringify(save)).toBe(before);
  });
});
