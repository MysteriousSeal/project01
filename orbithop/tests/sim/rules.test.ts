import { describe, expect, it } from '@jest/globals';
import { challengeTypeById } from '../../src/game/meta/challengeTypes';
import { createState, planetOf, step } from '../../src/game/sim/engine';
import { seededRng } from '../../src/game/sim/rng';
import { DT, H, hop, hopTo, newGame, W } from '../helpers';

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

it('engine steps stay stable under slow motion', () => {
  const s = newGame();
  s.slowmo = 1;
  for (let i = 0; i < 100; i++) step(s, DT);
  expect(s.slowmo).toBeCloseTo(1 - 100 * DT, 5);
});
