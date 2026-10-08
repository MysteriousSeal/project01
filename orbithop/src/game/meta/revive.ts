import type { RunMode } from './session';

/** Coins for the 1st and 2nd revive of a run. */
export const REVIVE_PRICES = [50, 150] as const;
export const MAX_REVIVES = REVIVE_PRICES.length;
export const REVIVE_SECONDS = 5;

/**
 * Price of the next revive, or null when none is offered: daily challenges stay
 * the same for everyone, and a run can only be revived a couple of times.
 */
export function reviveOffer(mode: RunMode, used: number, wallet: number): number | null {
  if (mode !== 'normal' || used >= MAX_REVIVES) return null;
  const price = REVIVE_PRICES[used];
  return wallet >= price ? price : null;
}
