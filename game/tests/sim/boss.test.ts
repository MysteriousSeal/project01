import { describe, expect, it } from '@jest/globals';
import { isBossIndex, planetOf, step, TUNING, WORLD } from '../../src/game/sim/engine';
import { drain, FROM_BELOW, hop, hopTo, newGame, W } from '../helpers';

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
