import { describe, expect, it } from '@jest/globals';
import { armedBoosts, boostCount, BOOSTS, buyBoost, consumeBoosts, HEAD_START_PLANET, MAX_BOOST_STACK } from '../../src/game/meta/boosts';
import { startRun } from '../../src/game/meta/session';
import { modsFrom } from '../../src/game/meta/upgrades';
import { createState, currentPlanet, DEFAULT_MODS, step } from '../../src/game/sim/engine';
import { seededRng } from '../../src/game/sim/rng';
import { day, H, hop, MONDAY, newGame, saveWith, W } from '../helpers';

const shield = BOOSTS.find((b) => b.id === 'shield')!;

describe('buying boosts', () => {
  it('stacks up to the cap and charges each time', () => {
    let save = saveWith({ wallet: shield.price * (MAX_BOOST_STACK + 1) });
    for (let i = 1; i <= MAX_BOOST_STACK; i++) {
      save = buyBoost(save, 'shield')!;
      expect(boostCount(save, 'shield')).toBe(i);
    }
    expect(buyBoost(save, 'shield')).toBeNull();
    expect(save.wallet).toBe(shield.price);
  });

  it('refuses unknown or unaffordable boosts', () => {
    expect(buyBoost(saveWith({ wallet: 9999 }), 'nope')).toBeNull();
    expect(buyBoost(saveWith({ wallet: shield.price - 1 }), 'shield')).toBeNull();
  });
});

describe('using boosts', () => {
  it('consumes one of each armed boost and applies its effect', () => {
    const save = saveWith({ boosts: { shield: 2, coins2x: 1, headStart: 1 } });
    const { save: after, effect } = consumeBoosts(save, DEFAULT_MODS);
    expect(after.boosts).toEqual({ shield: 1, coins2x: 0, headStart: 0 });
    expect(armedBoosts(after).map((b) => b.id)).toEqual(['shield']);
    expect(effect.mods.startShield).toBe(true);
    expect(effect.mods.coinMultiplier).toBe(2);
    expect(effect.headStart).toBe(HEAD_START_PLANET);
  });

  it('leaves the save untouched when nothing is armed', () => {
    const save = saveWith();
    const res = consumeBoosts(save, DEFAULT_MODS);
    expect(res.save).toBe(save);
    expect(res.effect).toEqual({ mods: DEFAULT_MODS, headStart: 0 });
  });

  it('applies to normal runs only', () => {
    const save = saveWith({ boosts: { coins2x: 1 }, upgrades: { magnet: 1 } });
    const normal = startRun(save, 'normal', '', day(MONDAY))!;
    expect(normal.config.mods).toEqual({ ...modsFrom({ magnet: 1 }), coinMultiplier: 2 });
    expect(normal.save.boosts.coins2x).toBe(0);
    const daily = startRun(save, 'daily', 'classic', day(MONDAY))!;
    expect(daily.config.mods).toEqual(DEFAULT_MODS);
    expect(daily.save.boosts.coins2x).toBe(1);
  });
});

describe('boost effects in the engine', () => {
  it('doubles every coin with the coin doubler', () => {
    const plain = newGame(1);
    const doubled = newGame(1, { mods: { ...DEFAULT_MODS, coinMultiplier: 2 } });
    for (const s of [plain, doubled]) {
      s.coins = [{ x: s.bx, y: s.by, taken: false }];
      step(s, 1 / 120);
    }
    expect(plain.coinsRun).toBe(1);
    expect(doubled.coinsRun).toBe(2);
  });

  it('starts on the head-start planet with matching score and camera', () => {
    const s = createState(W, H, { rng: seededRng(4), headStart: HEAD_START_PLANET });
    const p = currentPlanet(s);
    expect(s.cur).toBe(HEAD_START_PLANET);
    expect(s.score).toBe(HEAD_START_PLANET);
    expect(Math.hypot(s.bx - p.x, s.by - p.y)).toBeCloseTo(p.orbit);
    expect(s.camY).toBeCloseTo(p.y - H * 0.65);
    expect(s.planets.some((q) => q.idx === HEAD_START_PLANET + 1)).toBe(true);
    hop(s);
    expect(s.cur).toBe(HEAD_START_PLANET + 1);
    expect(s.dead).toBe(false);
  });
});
