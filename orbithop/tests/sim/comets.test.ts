import { describe, expect, it } from '@jest/globals';
import { createState, isBossIndex, step, TUNING } from '../../src/game/sim/engine';
import { seededRng } from '../../src/game/sim/rng';
import { COMET_FROM, DEFAULT_RULES } from '../../src/game/sim/world';
import { drain, H, hop, hopTo, newGame, W } from '../helpers';

const always = () => 0;
const layout = (s: ReturnType<typeof newGame>) => s.planets.map((p) => [p.idx, Math.round(p.x), Math.round(p.y)]);

describe('comets', () => {
  it('never appear without a comet generator', () => {
    const s = newGame(2);
    hopTo(s, 30);
    expect(s.planets.every((p) => p.comet === 0)).toBe(true);
    expect(s.comets).toEqual([]);
  });

  it('leave the planet layout of seeded runs unchanged', () => {
    const plain = newGame(3);
    const withComets = newGame(3, { cometRng: seededRng(9) });
    hopTo(plain, 20);
    hopTo(withComets, 20);
    expect(layout(withComets)).toEqual(layout(plain));
  });

  it('are the same for every player of a seeded run', () => {
    const a = newGame(4, { cometRng: seededRng(11) });
    const b = newGame(4, { cometRng: seededRng(11) });
    hopTo(a, 40);
    hopTo(b, 40);
    expect(a.planets.map((p) => p.comet)).toEqual(b.planets.map((p) => p.comet));
  });

  it('skip early planets and boss approaches', () => {
    const fresh = newGame(5, { cometRng: always });
    expect(fresh.planets.filter((p) => p.idx < COMET_FROM).every((p) => p.comet === 0)).toBe(true);
    const s = newGame(5, { cometRng: always });
    hopTo(s, 22);
    expect(s.planets.some((p) => p.boss)).toBe(true);
    const ahead = s.planets.filter((p) => p.idx > s.cur);
    expect(ahead.length).toBeGreaterThan(2);
    for (const p of ahead) {
      const allowed = p.idx >= COMET_FROM && !p.boss && !isBossIndex(p.idx + 1, DEFAULT_RULES.bossEvery);
      expect(p.comet !== 0).toBe(allowed);
    }
  });

  it('cross the gap after landing and pay out when caught', () => {
    const s = newGame(6, { cometRng: always });
    hopTo(s, COMET_FROM + 1);
    drain(s);
    expect(s.cur).toBe(COMET_FROM);
    expect(s.comets).toHaveLength(1);
    const c = s.comets[0];
    const x = c.x;
    step(s, 0.1);
    expect(Math.sign(c.x - x)).toBe(Math.sign(c.vx));

    const coins = s.coinsRun;
    c.x = s.bx;
    c.y = s.by;
    step(s, 1 / 120);
    expect(s.cometsRun).toBe(1);
    expect(s.coinsRun).toBe(coins + TUNING.cometCoins);
    expect(s.slowmo).toBeGreaterThan(0);
    expect(drain(s)).toContain('comet');
    expect(s.comets).toHaveLength(0);
  });

  it('respect the coin doubler and leave the screen when missed', () => {
    const s = createState(W, H, { rng: seededRng(6), cometRng: always, mods: { ...createState(W, H).mods, coinMultiplier: 2 } });
    hopTo(s, COMET_FROM + 1);
    const c = s.comets[0];
    c.x = s.bx;
    c.y = s.by;
    const coins = s.coinsRun;
    step(s, 1 / 120);
    expect(s.coinsRun - coins).toBe(TUNING.cometCoins * 2);

    hop(s);
    const missed = s.comets[0];
    missed.x = missed.vx > 0 ? W + 100 : -100;
    hop(s);
    expect(s.comets.includes(missed)).toBe(false);
  });
});
