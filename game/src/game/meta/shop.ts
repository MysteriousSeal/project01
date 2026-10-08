import { CATALOG, CosmeticKind } from './cosmetics';
import type { Save } from './save';
import { maxLevel, upgradeById } from './upgrades';

export type ShopResult = Save | null;

export const priceOf = (kind: CosmeticKind, id: string) => CATALOG[kind].items.find((i) => i.id === id)?.price;

export const isExclusive = (kind: CosmeticKind, id: string) => CATALOG[kind].items.some((i) => i.id === id && i.exclusive);

export const owns = (save: Save, kind: CosmeticKind, id: string) => save[CATALOG[kind].owned].includes(id);

export type OfferItem = { kind: CosmeticKind; id: string };

export function grant(save: Save, items: OfferItem[], price: number, equip = true): ShopResult {
  if (save.wallet < price || items.some((it) => priceOf(it.kind, it.id) === undefined)) return null;
  const next: Save = { ...save, wallet: save.wallet - price };
  for (const { kind, id } of items) {
    const { owned, equipped } = CATALOG[kind];
    if (!next[owned].includes(id)) next[owned] = [...next[owned], id];
    if (equip) next[equipped] = id;
  }
  return next;
}

export function buyCosmetic(save: Save, kind: CosmeticKind, id: string): ShopResult {
  const price = priceOf(kind, id);
  if (price === undefined || isExclusive(kind, id) || owns(save, kind, id)) return null;
  return grant(save, [{ kind, id }], price);
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
