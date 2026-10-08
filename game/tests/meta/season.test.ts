import { describe, expect, it } from '@jest/globals';
import { diffLedger } from '../../src/game/meta/ledger';
import { applyRun } from '../../src/game/meta/progress';
import { normalizeSave } from '../../src/game/meta/save';
import { addSeasonPoints, claimSeason, rewardLabel, SEASON, SEASON_TIERS, seasonCoins, seasonOpen, seasonStatus, tierReached } from '../../src/game/meta/season';
import { buyCosmetic } from '../../src/game/meta/shop';
import { nextSkin } from '../../src/game/meta/cosmetics';
import { seededRng } from '../../src/game/sim/rng';
import { result, saveWith } from '../helpers';

const during = new Date(2026, 9, 8, 12);
const lastMinute = new Date(2026, 11, 31, 23, 59);
const after = new Date(2027, 0, 1, 0, 0, 1);
const P = SEASON.pointsPerTier;
const withPoints = (points: number, claimed: number[] = []) => saveWith({ season: { id: SEASON.id, points, claimed } });

describe('season window', () => {
  it('stays open through 31 December 2026', () => {
    expect(seasonOpen(during)).toBe(true);
    expect(seasonOpen(lastMinute)).toBe(true);
    expect(seasonOpen(after)).toBe(false);
    expect(seasonOpen(new Date(2026, 8, 30))).toBe(false);
  });

  it('accepts server claims for a week after the last time zone ends', () => {
    expect(new Date(SEASON.claimsUntilUtc).toISOString()).toBe('2027-01-08T12:00:00.000Z');
  });
});

describe('season progress', () => {
  it('has 30 tiers with an exclusive at 10, 20 and 30', () => {
    expect(SEASON_TIERS).toBe(30);
    expect([10, 20, 30].map((t) => SEASON.tiers[t - 1].item?.kind)).toEqual(['trail', 'theme', 'skin']);
    expect(SEASON.tiers.every((t) => t.coins || t.boost || t.item)).toBe(true);
  });

  it('turns points into tiers, capped at the last', () => {
    expect(tierReached(P - 1)).toBe(0);
    expect(tierReached(P * 3 + 5)).toBe(3);
    expect(tierReached(P * 99)).toBe(SEASON_TIERS);
  });

  it('earns points only while the season is open', () => {
    expect(addSeasonPoints(saveWith(), 120, during).season.points).toBe(120);
    const closed = saveWith();
    expect(addSeasonPoints(closed, 120, after)).toBe(closed);
  });

  it('comes from every run, normal and daily', () => {
    const normal = applyRun(saveWith(), result({ score: 300, planets: 200, perfects: 50, coins: 10 }), { rng: seededRng(1), now: during });
    expect(normal.save.season.points).toBe(normal.xpGained);
    expect(normal.seasonTiers).toBe(tierReached(normal.xpGained));
    const daily = applyRun(saveWith(), result({ score: 20, planets: 20 }), { mode: 'daily', challenge: 'classic', rng: seededRng(1), now: during });
    expect(daily.save.season.points).toBe(daily.xpGained);
  });

  it('restarts when a new season begins', () => {
    const old = saveWith({ season: { id: 's0', points: P * 10, claimed: [1, 2] } });
    expect(seasonStatus(old, during)).toMatchObject({ points: 0, reached: 0, claimed: [] });
    expect(addSeasonPoints(old, 10, during).season).toEqual({ id: SEASON.id, points: 10, claimed: [] });
  });

  it('survives saves and drops junk', () => {
    const s = normalizeSave({ season: { id: 's1', points: 900.7, claimed: [3, 1, 1, 0, 31, 'x', 2.5] } });
    expect(s.season).toEqual({ id: 's1', points: 900, claimed: [1, 3] });
    expect(normalizeSave({}).season).toEqual({ id: SEASON.id, points: 0, claimed: [] });
  });
});

describe('claiming tiers', () => {
  it('grants coins, boosts and exclusive cosmetics', () => {
    const s = withPoints(P * 10);
    const claimed = claimSeason(s, undefined, during)!;
    expect(claimed.tiers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(claimed.save.wallet).toBe(seasonCoins(claimed.tiers));
    expect(claimed.save.boosts).toMatchObject({ shield: 1, coins2x: 1, headStart: 1 });
    expect(claimed.save.trails).toContain('stardust');
    expect(claimed.coinTiers).toEqual([1, 3, 4, 5, 7, 8]);
    expect(seasonStatus(claimed.save, during).claimable).toEqual([]);
  });

  it('claims one tier at a time and never twice', () => {
    const s = withPoints(P * 3);
    const first = claimSeason(s, [2], during)!;
    expect(first.tiers).toEqual([2]);
    expect(first.save.season.claimed).toEqual([2]);
    expect(claimSeason(first.save, [2], during)).toBeNull();
    expect(claimSeason(first.save, [5], during)).toBeNull();
    expect(seasonStatus(first.save, during).claimable).toEqual([1, 3]);
  });

  it('stops after the season ends', () => {
    expect(claimSeason(withPoints(P * 5), undefined, after)).toBeNull();
    expect(seasonStatus(withPoints(P * 5), after)).toMatchObject({ open: false, claimable: [] });
  });

  it('records one ledger entry listing only the coin tiers', () => {
    const s = withPoints(P * 6);
    const claimed = claimSeason(s, undefined, during)!;
    const entries = diffLedger(s, claimed.save, { source: 'season', season: SEASON.id, tiers: claimed.coinTiers }, () => 'x');
    expect(entries).toEqual([{ id: 'x', kind: 'earn', source: 'season', amount: seasonCoins(claimed.coinTiers), wallet_after: claimed.save.wallet, detail: { season: 's1', tiers: claimed.coinTiers } }]);
  });

  it('caps boosts at the stack limit', () => {
    const s = saveWith({ season: { id: SEASON.id, points: P * 2, claimed: [] }, boosts: { shield: 9 } });
    expect(claimSeason(s, [2], during)!.save.boosts.shield).toBe(9);
  });

  it('labels every reward', () => {
    expect(rewardLabel(SEASON.tiers[0])).toBe('50 coins');
    expect(rewardLabel(SEASON.tiers[1])).toBe('Extra Shield');
    expect(rewardLabel(SEASON.tiers[29])).toBe('Deep Orbit skin + 500 coins');
  });
});

describe('exclusive cosmetics', () => {
  it('cannot be bought or suggested as the next unlock', () => {
    expect(buyCosmetic(saveWith({ wallet: 99999 }), 'skin', 'deeporbit')).toBeNull();
    expect(buyCosmetic(saveWith({ wallet: 99999 }), 'trail', 'stardust')).toBeNull();
    const all = saveWith({ skins: ['classic', 'ember', 'mint', 'aqua', 'gold', 'cherry', 'violet', 'lime', 'ice', 'rose', 'galaxy', 'void', 'aurora', 'sun', 'obsidian'] });
    expect(nextSkin(all)).toBeUndefined();
  });
});
