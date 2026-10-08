import { describe, expect, it } from '@jest/globals';
import { diffLedger } from '../../src/game/meta/ledger';
import { applyRun, shortOfBest } from '../../src/game/meta/progress';
import { normalizeSave } from '../../src/game/meta/save';
import { addRunStats, awardTrophies, emptyStats, TROPHIES, TROPHY_COUNT, TROPHY_TIERS, trophiesDue, trophiesEarned, trophyProgress } from '../../src/game/meta/trophies';
import { seededRng } from '../../src/game/sim/rng';
import { result, saveWith } from '../helpers';

const byId = (id: string) => TROPHIES.find((t) => t.id === id)!;

describe('lifetime stats', () => {
  it('add up run totals and keep the best combo', () => {
    const a = addRunStats(emptyStats(), result({ planets: 10, perfects: 4, coins: 7, bosses: 1, comets: 2, fevers: 1, bestCombo: 6 }));
    const b = addRunStats(a, result({ planets: 5, perfects: 1, coins: 3, bestCombo: 2 }));
    expect(b).toEqual({ planets: 15, perfects: 5, coins: 10, bosses: 1, comets: 2, fevers: 1, bestCombo: 6 });
  });

  it('survive saves and reject junk', () => {
    const s = normalizeSave({ stats: { planets: 12, comets: -3, bosses: 'x', bestCombo: 4.7 }, trophies: { hopper: 2, highFlyer: 9, fake: 3 } });
    expect(s.stats).toEqual({ ...emptyStats(), planets: 12, bestCombo: 4 });
    expect(s.trophies).toEqual({ hopper: 2, highFlyer: 3 });
    expect(normalizeSave({}).stats).toEqual(emptyStats());
  });
});

describe('trophies', () => {
  it('have three increasing targets and unique ids', () => {
    expect(new Set(TROPHIES.map((t) => t.id)).size).toBe(TROPHIES.length);
    for (const t of TROPHIES) expect(t.targets[0] < t.targets[1] && t.targets[1] < t.targets[2]).toBe(true);
    expect(TROPHY_COUNT).toBe(TROPHIES.length * 3);
  });

  it('grant every newly reached tier once, with coins', () => {
    const save = saveWith({ best: 160, wallet: 10 });
    const first = awardTrophies(save);
    const highFlyer = first.unlocked.filter((u) => u.trophy.id === 'highFlyer').map((u) => u.tier);
    expect(highFlyer).toEqual([1, 2]);
    expect(first.coins).toBe(TROPHY_TIERS[0].reward + TROPHY_TIERS[1].reward);
    expect(first.save.wallet).toBe(10 + first.coins);
    expect(first.save.trophies.highFlyer).toBe(2);
    expect(trophiesEarned(first.save)).toBe(2);

    const again = awardTrophies(first.save);
    expect(again.unlocked).toEqual([]);
    expect(again.save).toBe(first.save);
  });

  it('report progress toward the next tier', () => {
    const s = saveWith({ stats: { ...emptyStats(), comets: 4 }, trophies: { cometCatcher: 1 } });
    expect(trophyProgress(byId('cometCatcher'), s)).toEqual({ tier: 1, target: 10, value: 4, done: false });
    const done = saveWith({ games: 5000, trophies: { regular: 3 } });
    expect(trophyProgress(byId('regular'), done)).toMatchObject({ tier: 3, target: 1000, done: true });
  });

  it('unlock at the end of a run and pay through the run ledger entry', () => {
    const save = saveWith({ wallet: 0 });
    const r = result({ score: 60, planets: 25, coins: 5, bosses: 1, comets: 1 });
    const report = applyRun(save, r, { rng: seededRng(1) });
    const ids = report.trophies.map((u) => u.trophy.id);
    expect(ids).toEqual(expect.arrayContaining(['highFlyer', 'explorer', 'bossSlayer', 'cometCatcher']));
    expect(report.save.stats).toMatchObject({ planets: 25, bosses: 1, comets: 1 });
    const trophyCoins = report.trophies.reduce((a, u) => a + u.reward, 0);
    expect(report.save.wallet).toBe(r.coins + report.levelReward + report.completed.reduce((a, m) => a + m.reward, 0) + trophyCoins);
    const entries = diffLedger(save, report.save, { source: 'run', runId: 'r1' }, () => 'e1');
    expect(entries).toEqual([
      expect.objectContaining({ kind: 'earn', source: 'run', amount: report.save.wallet - trophyCoins, wallet_after: report.save.wallet - trophyCoins }),
      expect.objectContaining({ kind: 'earn', source: 'trophy', amount: trophyCoins, wallet_after: report.save.wallet }),
    ]);
    expect(entries[1].detail.trophies).toEqual(report.trophies.map((u) => ({ id: u.trophy.id, tier: u.tier })));
  });

  it('count daily challenge runs too', () => {
    const report = applyRun(saveWith(), result({ score: 5, planets: 5, comets: 1 }), { mode: 'daily', challenge: 'classic', rng: seededRng(1) });
    expect(report.save.stats.comets).toBe(1);
    expect(report.trophies.map((u) => u.trophy.id)).toContain('cometCatcher');
  });

  it('stay within the server limit for a run reward even when a veteran updates', () => {
    const veteran = saveWith({ best: 10_000, bestPlanet: 10_000, games: 10_000 });
    const report = applyRun(veteran, result({ score: 1, planets: 1 }), { rng: seededRng(1) });
    const extra = report.save.wallet - 0;
    expect(extra).toBeLessThanOrEqual(2000);
  });
});

describe('trophies reached outside a run', () => {
  it('are due when records already meet a tier', () => {
    expect(trophiesDue(saveWith({ bestPlanet: 20, games: 10 }))).toBe(true);
    expect(trophiesDue(saveWith({ bestPlanet: 20, games: 10, trophies: { explorer: 1, regular: 1 } }))).toBe(false);
    expect(trophiesDue(saveWith())).toBe(false);
  });

  it('pay with a single trophy ledger entry', () => {
    const prev = saveWith({ bestPlanet: 20, games: 10, wallet: 246 });
    const next = awardTrophies(prev).save;
    expect(next.wallet).toBe(246 + 2 * TROPHY_TIERS[0].reward);
    expect(diffLedger(prev, next, { source: 'trophy' }, () => 't1')).toEqual([
      { id: 't1', kind: 'earn', source: 'trophy', amount: 50, wallet_after: 296, detail: { trophies: [{ id: 'explorer', tier: 1 }, { id: 'regular', tier: 1 }] } },
    ]);
  });

  it('do not change other ledger entries', () => {
    const prev = saveWith({ wallet: 100, trophies: { regular: 1 } });
    expect(diffLedger(prev, { ...prev, wallet: 130 }, { source: 'daily_reward' }, () => 'd')).toEqual([
      expect.objectContaining({ source: 'daily_reward', amount: 30, wallet_after: 130 }),
    ]);
  });
});

describe('so close', () => {
  it('flags runs within 10% of the best', () => {
    expect(shortOfBest(45, 50)).toBe(5);
    expect(shortOfBest(48, 50)).toBe(2);
    expect(shortOfBest(44, 50)).toBeNull();
    expect(shortOfBest(8, 10)).toBe(2);
    expect(shortOfBest(50, 50)).toBeNull();
    expect(shortOfBest(60, 50)).toBeNull();
    expect(shortOfBest(5, 7)).toBeNull();
    expect(shortOfBest(0, 12)).toBeNull();
  });

  it('only shows on normal runs', () => {
    expect(applyRun(saveWith({ best: 50 }), result({ score: 47, planets: 40 }), { rng: seededRng(1) }).toBest).toBe(3);
    expect(applyRun(saveWith({ best: 50 }), result({ score: 47, planets: 40 }), { mode: 'daily', challenge: 'classic', rng: seededRng(1) }).toBest).toBeNull();
  });
});
