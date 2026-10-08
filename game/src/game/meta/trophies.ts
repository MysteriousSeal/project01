import { C } from '../palette';
import type { RunResult } from '../sim/engine';
import type { Save } from './save';

/** Lifetime totals that trophies track on top of the save's own records. */
export type LifetimeStats = { planets: number; perfects: number; coins: number; bosses: number; comets: number; fevers: number; bestCombo: number };

export const emptyStats = (): LifetimeStats => ({ planets: 0, perfects: 0, coins: 0, bosses: 0, comets: 0, fevers: 0, bestCombo: 0 });

export const STAT_KEYS = Object.keys(emptyStats()) as (keyof LifetimeStats)[];

export const addRunStats = (s: LifetimeStats, r: RunResult): LifetimeStats => ({
  planets: s.planets + r.planets,
  perfects: s.perfects + r.perfects,
  coins: s.coins + r.coins,
  bosses: s.bosses + r.bosses,
  comets: s.comets + r.comets,
  fevers: s.fevers + r.fevers,
  bestCombo: Math.max(s.bestCombo, r.bestCombo),
});

export const TROPHY_TIERS = [
  { name: 'Bronze', reward: 25, color: C.bronze },
  { name: 'Silver', reward: 75, color: C.silver },
  { name: 'Gold', reward: 200, color: C.gold },
] as const;

export type TrophyIcon = 'earth-americas' | 'rocket' | 'compass' | 'gem' | 'bolt' | 'fire' | 'skull' | 'meteor' | 'coins' | 'gamepad';

export type Trophy = {
  id: string;
  name: string;
  icon: TrophyIcon;
  /** Describes the goal for a given target, e.g. "Hop 100 planets". */
  goal: (target: number) => string;
  value: (save: Save) => number;
  targets: readonly [number, number, number];
};

export const TROPHIES: readonly Trophy[] = [
  { id: 'hopper', name: 'Planet Hopper', icon: 'earth-americas', goal: (n) => `Hop ${n} planets in total`, value: (s) => s.stats.planets, targets: [100, 1000, 10000] },
  { id: 'highFlyer', name: 'High Flyer', icon: 'rocket', goal: (n) => `Score ${n} in one run`, value: (s) => s.best, targets: [50, 150, 400] },
  { id: 'explorer', name: 'Explorer', icon: 'compass', goal: (n) => `Reach planet ${n}`, value: (s) => s.bestPlanet, targets: [20, 60, 100] },
  { id: 'perfectionist', name: 'Perfectionist', icon: 'gem', goal: (n) => `Land ${n} perfects in total`, value: (s) => s.stats.perfects, targets: [50, 500, 5000] },
  { id: 'comboKing', name: 'Combo King', icon: 'bolt', goal: (n) => `Hit a x${n} combo`, value: (s) => s.stats.bestCombo, targets: [8, 15, 30] },
  { id: 'feverDream', name: 'Fever Dream', icon: 'fire', goal: (n) => `Trigger fever ${n} times`, value: (s) => s.stats.fevers, targets: [5, 50, 300] },
  { id: 'bossSlayer', name: 'Boss Slayer', icon: 'skull', goal: (n) => `Clear ${n} ${n === 1 ? 'boss' : 'bosses'}`, value: (s) => s.stats.bosses, targets: [1, 10, 50] },
  { id: 'cometCatcher', name: 'Comet Catcher', icon: 'meteor', goal: (n) => `Catch ${n} ${n === 1 ? 'comet' : 'comets'}`, value: (s) => s.stats.comets, targets: [1, 10, 50] },
  { id: 'hoarder', name: 'Hoarder', icon: 'coins', goal: (n) => `Collect ${n} coins in runs`, value: (s) => s.stats.coins, targets: [200, 2000, 20000] },
  { id: 'regular', name: 'Regular', icon: 'gamepad', goal: (n) => `Play ${n} games`, value: (s) => s.games, targets: [10, 100, 1000] },
];

export const MAX_TROPHY_TIER = TROPHY_TIERS.length;
export const TROPHY_COUNT = TROPHIES.length * MAX_TROPHY_TIER;

export const tierOf = (save: Save, id: string) => save.trophies[id] ?? 0;
export const trophiesEarned = (save: Save) => TROPHIES.reduce((a, t) => a + tierOf(save, t.id), 0);

/** Tiers whose targets the save already meets. */
export const reachedTier = (t: Trophy, save: Save) => t.targets.filter((n) => t.value(save) >= n).length;

/** True when the save meets a tier it has not been rewarded for yet. */
export const trophiesDue = (save: Save) => TROPHIES.some((t) => reachedTier(t, save) > tierOf(save, t.id));

export type TrophyUnlock = { trophy: Trophy; tier: number; reward: number };

/** Grants every newly reached tier and its coins. Returns the same save when nothing changed. */
export function awardTrophies(save: Save): { save: Save; unlocked: TrophyUnlock[]; coins: number } {
  const unlocked: TrophyUnlock[] = [];
  const trophies = { ...save.trophies };
  for (const t of TROPHIES) {
    const reached = reachedTier(t, save);
    for (let tier = tierOf(save, t.id) + 1; tier <= reached; tier++) unlocked.push({ trophy: t, tier, reward: TROPHY_TIERS[tier - 1].reward });
    if (reached > tierOf(save, t.id)) trophies[t.id] = reached;
  }
  if (!unlocked.length) return { save, unlocked, coins: 0 };
  const coins = unlocked.reduce((a, u) => a + u.reward, 0);
  return { save: { ...save, trophies, wallet: save.wallet + coins }, unlocked, coins };
}

/** Progress toward the next tier, or the gold target once it is complete. */
export function trophyProgress(t: Trophy, save: Save) {
  const tier = tierOf(save, t.id);
  const target = t.targets[Math.min(tier, MAX_TROPHY_TIER - 1)];
  const value = t.value(save);
  return { tier, target, value: Math.min(value, target), done: tier >= MAX_TROPHY_TIER };
}
