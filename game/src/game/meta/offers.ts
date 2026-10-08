import { hashSeed, type Rng } from '../sim/rng';
import { dayKey } from './calendar';
import { CATALOG, COSMETIC_KINDS } from './cosmetics';
import type { Save } from './save';
import { grant, OfferItem, owns, priceOf, ShopResult } from './shop';

export const DEAL_DISCOUNT = 0.5;
export const MYSTERY_PRICE = 250;

const discounted = (price: number, discount: number) => Math.max(1, Math.round(price * (1 - discount)));

const PAID: OfferItem[] = COSMETIC_KINDS.flatMap((kind) => CATALOG[kind].items.filter((i) => i.price > 0).map((i) => ({ kind, id: i.id })));

const unowned = (save: Save) => PAID.filter((it) => !owns(save, it.kind, it.id));

export type Deal = OfferItem & { original: number; price: number };

export function dailyDeal(save: Save, now: Date = new Date()): Deal | null {
  if (save.dealDay === dayKey(now)) return null;
  const start = hashSeed(`deal:${dayKey(now)}`) % PAID.length;
  for (let i = 0; i < PAID.length; i++) {
    const it = PAID[(start + i) % PAID.length];
    if (owns(save, it.kind, it.id)) continue;
    const original = priceOf(it.kind, it.id)!;
    return { ...it, original, price: discounted(original, DEAL_DISCOUNT) };
  }
  return null;
}

export function buyDeal(save: Save, now: Date = new Date()): ShopResult {
  const deal = dailyDeal(save, now);
  const next = deal && grant(save, [deal], deal.price);
  return next ? { ...next, dealDay: dayKey(now) } : null;
}

export type Bundle = { id: string; name: string; tagline: string; items: OfferItem[]; discount: number };

export const BUNDLES: Bundle[] = [
  { id: 'starter', name: 'Starter Pack', tagline: 'Everything to stand out from run one.', discount: 0.5, items: [{ kind: 'skin', id: 'ember' }, { kind: 'trail', id: 'pixel' }, { kind: 'theme', id: 'candy' }] },
  { id: 'speed', name: 'Speedster', tagline: 'Hot colors for fast hands.', discount: 0.4, items: [{ kind: 'skin', id: 'cherry' }, { kind: 'trail', id: 'flame' }, { kind: 'theme', id: 'lava' }] },
  { id: 'collector', name: 'Collector', tagline: 'Our rarest looks in one box.', discount: 0.35, items: [{ kind: 'skin', id: 'galaxy' }, { kind: 'skin', id: 'aurora' }, { kind: 'trail', id: 'rainbow' }, { kind: 'theme', id: 'neon' }] },
];

export const bundleById = (id: string) => BUNDLES.find((b) => b.id === id);

export function bundleOffer(save: Save, b: Bundle) {
  const missing = b.items.filter((it) => !owns(save, it.kind, it.id));
  const full = missing.reduce((a, it) => a + priceOf(it.kind, it.id)!, 0);
  return { missing, full, price: missing.length ? discounted(full, b.discount) : 0 };
}

export function buyBundle(save: Save, id: string): ShopResult {
  const b = bundleById(id);
  if (!b) return null;
  const offer = bundleOffer(save, b);
  return offer.missing.length ? grant(save, offer.missing, offer.price) : null;
}

export const mysteryPool = (save: Save) => unowned(save);

export function openMysteryBox(save: Save, rng: Rng = Math.random): { save: Save; prize: OfferItem } | null {
  const pool = mysteryPool(save);
  if (!pool.length || save.wallet < MYSTERY_PRICE) return null;
  const weights = pool.map((it) => 1 / Math.sqrt(priceOf(it.kind, it.id)!));
  let roll = rng() * weights.reduce((a, w) => a + w, 0);
  let prize = pool[pool.length - 1];
  for (let i = 0; i < pool.length; i++) {
    roll -= weights[i];
    if (roll <= 0) {
      prize = pool[i];
      break;
    }
  }
  const next = grant(save, [prize], MYSTERY_PRICE, false);
  return next ? { save: next, prize } : null;
}
