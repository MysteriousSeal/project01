import { boostById, MAX_BOOST_STACK } from './boosts';
import { CATALOG } from './cosmetics';
import type { Save } from './save';
import type { OfferItem } from './shop';

/** One tier's reward: coins, a boost, an exclusive cosmetic, or a mix. */
export type SeasonReward = { coins?: number; boost?: string; item?: OfferItem };

export type Season = {
  /** Short and SQL-safe: it names the season's catalog rows. */
  id: string;
  name: string;
  /** Local time on the player's phone. The season is open from `start` until just before `end`. */
  start: Date;
  end: Date;
  /**
   * Last moment the server accepts claims, in UTC: the end of the final day in the latest time
   * zone (UTC-12), plus a week for claims made offline to upload.
   */
  claimsUntilUtc: number;
  pointsPerTier: number;
  tiers: SeasonReward[];
};

const c = (coins: number): SeasonReward => ({ coins });
const b = (boost: string): SeasonReward => ({ boost });

export const SEASON: Season = {
  id: 's1',
  name: 'Deep Orbit',
  start: new Date(2026, 9, 1),
  end: new Date(2027, 0, 1),
  claimsUntilUtc: Date.UTC(2027, 0, 1, 12) + 7 * 24 * 3600 * 1000,
  pointsPerTier: 400,
  tiers: [
    c(50), b('shield'), c(60), c(70), c(150),
    b('coins2x'), c(80), c(90), b('headStart'), { item: { kind: 'trail', id: 'stardust' } },
    c(100), b('shield'), c(110), c(120), c(250),
    b('coins2x'), c(130), c(140), b('headStart'), { item: { kind: 'theme', id: 'deeporbit' } },
    c(150), b('shield'), c(160), c(170), c(400),
    b('coins2x'), c(180), c(190), b('headStart'), { coins: 500, item: { kind: 'skin', id: 'deeporbit' } },
  ],
};

export const SEASON_TIERS = SEASON.tiers.length;

/** The season saved with the player's progress. A different id means a fresh season. */
export type SeasonProgress = { id: string; points: number; claimed: number[] };

export const emptySeason = (): SeasonProgress => ({ id: SEASON.id, points: 0, claimed: [] });

export const seasonOpen = (now: Date = new Date(), season: Season = SEASON) => now >= season.start && now < season.end;

/** Progress for the current season, ignoring anything saved for an older one. */
export const currentSeason = (p: SeasonProgress, season: Season = SEASON): SeasonProgress => (p.id === season.id ? p : { id: season.id, points: 0, claimed: [] });

export const tierReached = (points: number, season: Season = SEASON) => Math.min(Math.floor(points / season.pointsPerTier), season.tiers.length);

export function seasonStatus(save: Save, now: Date = new Date(), season: Season = SEASON) {
  const p = currentSeason(save.season, season);
  const reached = tierReached(p.points, season);
  const open = seasonOpen(now, season);
  const claimable = open ? Array.from({ length: reached }, (_, i) => i + 1).filter((t) => !p.claimed.includes(t)) : [];
  const done = reached >= season.tiers.length;
  return {
    open,
    points: p.points,
    reached,
    claimable,
    claimed: p.claimed,
    /** Points earned toward the next tier, and how many that tier needs. */
    into: done ? season.pointsPerTier : p.points - reached * season.pointsPerTier,
    need: season.pointsPerTier,
    done,
    msLeft: Math.max(0, season.end.getTime() - now.getTime()),
  };
}

/** Adds points from a run while the season is open. */
export function addSeasonPoints(save: Save, points: number, now: Date = new Date(), season: Season = SEASON): Save {
  if (points <= 0 || !seasonOpen(now, season)) return save;
  const p = currentSeason(save.season, season);
  return { ...save, season: { ...p, points: p.points + points } };
}

const coinsOf = (tier: number, season: Season) => season.tiers[tier - 1]?.coins ?? 0;

/** Coins paid for a set of tiers; the server checks claims against the same numbers. */
export const seasonCoins = (tiers: number[], season: Season = SEASON) => tiers.reduce((a, t) => a + coinsOf(t, season), 0);

function grantReward(save: Save, r: SeasonReward): Save {
  let next = save;
  if (r.coins) next = { ...next, wallet: next.wallet + r.coins };
  if (r.boost && boostById(r.boost)) next = { ...next, boosts: { ...next.boosts, [r.boost]: Math.min((next.boosts[r.boost] ?? 0) + 1, MAX_BOOST_STACK) } };
  if (r.item) {
    const { owned } = CATALOG[r.item.kind];
    if (!next[owned].includes(r.item.id)) next = { ...next, [owned]: [...next[owned], r.item.id] };
  }
  return next;
}

/** Claims the given tiers (or every claimable one). Returns null when nothing can be claimed. */
/** `coinTiers` are the claimed tiers that pay coins: the ones the ledger entry lists for the server. */
export function claimSeason(save: Save, tiers?: number[], now: Date = new Date(), season: Season = SEASON): { save: Save; tiers: number[]; coinTiers: number[] } | null {
  const { claimable } = seasonStatus(save, now, season);
  const picked = tiers ? claimable.filter((t) => tiers.includes(t)) : claimable;
  if (!picked.length) return null;
  const p = currentSeason(save.season, season);
  let next: Save = { ...save, season: { ...p, claimed: [...p.claimed, ...picked].sort((x, y) => x - y) } };
  for (const t of picked) next = grantReward(next, season.tiers[t - 1]);
  return { save: next, tiers: picked, coinTiers: picked.filter((t) => coinsOf(t, season) > 0) };
}

export function rewardLabel(r: SeasonReward) {
  const parts: string[] = [];
  if (r.item) parts.push(`${CATALOG[r.item.kind].items.find((i) => i.id === r.item!.id)?.name ?? r.item.id} ${CATALOG[r.item.kind].label.toLowerCase()}`);
  if (r.boost) parts.push(boostById(r.boost)?.name ?? r.boost);
  if (r.coins) parts.push(`${r.coins} coins`);
  return parts.join(' + ');
}
