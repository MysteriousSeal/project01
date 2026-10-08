import { CATALOG, CosmeticKind } from './cosmetics';
import type { Save } from './save';
import { maxLevel, upgradeById } from './upgrades';

export type ShopResult = Save | null;

const priceOf = (kind: CosmeticKind, id: string) => CATALOG[kind].items.find((i) => i.id === id)?.price;

export const owns = (save: Save, kind: CosmeticKind, id: string) => save[CATALOG[kind].owned].includes(id);

export function buyCosmetic(save: Save, kind: CosmeticKind, id: string): ShopResult {
  const price = priceOf(kind, id);
  if (price === undefined || owns(save, kind, id) || save.wallet < price) return null;
  const { owned, equipped } = CATALOG[kind];
  return { ...save, wallet: save.wallet - price, [owned]: [...save[owned], id], [equipped]: id };
}

export function equipCosmetic(save: Save, kind: CosmeticKind, id: string): ShopResult {
  const { equipped } = CATALOG[kind];
  if (!owns(save, kind, id) || save[equipped] === id) return null;
  return { ...save, [equipped]: id };
}

export const upgradeLevel = (save: Save, id: string) => save.upgrades[id] ?? 0;

export function upgradeCost(save: Save, id: string): number | null {
  const u = upgradeById(id);
  const lvl = upgradeLevel(save, id);
  return u && lvl < maxLevel(id) ? u.costs[lvl] : null;
}

export function buyUpgrade(save: Save, id: string): ShopResult {
  const cost = upgradeCost(save, id);
  if (cost === null || save.wallet < cost) return null;
  return { ...save, wallet: save.wallet - cost, upgrades: { ...save.upgrades, [id]: upgradeLevel(save, id) + 1 } };
}
