import type { Mods } from '../sim/world';
import type { Save } from './save';

export type BoostId = 'shield' | 'coins2x' | 'headStart';
export type Boost = { id: BoostId; name: string; summary: string; price: number; icon: 'shield-halved' | 'coins' | 'rocket' };

export const BOOSTS: Boost[] = [
  { id: 'shield', name: 'Extra Shield', summary: 'Start your next run with a shield.', price: 120, icon: 'shield-halved' },
  { id: 'coins2x', name: 'Coin Doubler', summary: 'Every coin counts twice in your next run.', price: 150, icon: 'coins' },
  { id: 'headStart', name: 'Head Start', summary: 'Begin your next run at planet 10.', price: 200, icon: 'rocket' },
];

export const MAX_BOOST_STACK = 9;
export const HEAD_START_PLANET = 10;

export const boostById = (id: string) => BOOSTS.find((b) => b.id === id);
export const boostCount = (save: Save, id: string) => save.boosts[id] ?? 0;
export const armedBoosts = (save: Save) => BOOSTS.filter((b) => boostCount(save, b.id) > 0);

export function buyBoost(save: Save, id: string): Save | null {
  const b = boostById(id);
  if (!b || save.wallet < b.price || boostCount(save, id) >= MAX_BOOST_STACK) return null;
  return { ...save, wallet: save.wallet - b.price, boosts: { ...save.boosts, [id]: boostCount(save, id) + 1 } };
}

export type BoostEffect = { mods: Mods; headStart: number };

export function consumeBoosts(save: Save, mods: Mods): { save: Save; effect: BoostEffect } {
  const armed = armedBoosts(save);
  if (!armed.length) return { save, effect: { mods, headStart: 0 } };
  const boosts = { ...save.boosts };
  for (const b of armed) boosts[b.id] = boosts[b.id] - 1;
  const has = (id: BoostId) => armed.some((b) => b.id === id);
  return {
    save: { ...save, boosts },
    effect: {
      mods: { ...mods, startShield: mods.startShield || has('shield'), coinMultiplier: mods.coinMultiplier * (has('coins2x') ? 2 : 1) },
      headStart: has('headStart') ? HEAD_START_PLANET : 0,
    },
  };
}
