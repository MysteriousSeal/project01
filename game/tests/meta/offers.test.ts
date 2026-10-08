import { describe, expect, it } from '@jest/globals';
import { countdownToTomorrow, dayKey } from '../../src/game/meta/calendar';
import { CATALOG, COSMETIC_KINDS, THEMES } from '../../src/game/meta/cosmetics';
import { boxOpenedToday, BUNDLES, bundleOffer, buyBundle, buyDeal, dailyDeal, DEAL_DISCOUNT, MYSTERY_PRICE, mysteryPool, openMysteryBox } from '../../src/game/meta/offers';
import { normalizeSave } from '../../src/game/meta/save';
import { owns, priceOf } from '../../src/game/meta/shop';
import { seededRng } from '../../src/game/sim/rng';
import { day, MONDAY, saveWith } from '../helpers';

const everything = () =>
  saveWith({
    skins: CATALOG.skin.items.map((i) => i.id),
    trails: CATALOG.trail.items.map((i) => i.id),
    themes: CATALOG.theme.items.map((i) => i.id),
  });

describe('catalog', () => {
  it('has unique ids and one free default per category', () => {
    for (const kind of COSMETIC_KINDS) {
      const ids = CATALOG[kind].items.map((i) => i.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(CATALOG[kind].items.filter((i) => i.price === 0).map((i) => i.id)).toEqual(['classic']);
    }
  });

  it('themes produce a color for every planet', () => {
    for (const t of THEMES) for (let i = 0; i < 12; i++) expect(t.planet(i)).toMatch(/^(#|hsl)/);
  });

  it('every bundle item exists in the catalog', () => {
    for (const b of BUNDLES) for (const it of b.items) expect(priceOf(it.kind, it.id)).toBeGreaterThan(0);
  });
});

describe('daily deal', () => {
  const today = day(MONDAY);

  it('offers an unowned item at a discount, stable through the day', () => {
    const deal = dailyDeal(saveWith(), today)!;
    expect(owns(saveWith(), deal.kind, deal.id)).toBe(false);
    expect(deal.price).toBe(Math.round(deal.original * (1 - DEAL_DISCOUNT)));
    expect(dailyDeal(saveWith(), day(MONDAY, 22))).toEqual(deal);
  });

  it('skips items the player already owns', () => {
    const deal = dailyDeal(saveWith(), today)!;
    const owning = saveWith({ [CATALOG[deal.kind].owned]: ['classic', deal.id] });
    const next = dailyDeal(owning, today)!;
    expect(next.id === deal.id && next.kind === deal.kind).toBe(false);
  });

  it('can be bought once per day, then returns tomorrow', () => {
    const deal = dailyDeal(saveWith(), today)!;
    const bought = buyDeal(saveWith({ wallet: deal.price }), today)!;
    expect(bought.wallet).toBe(0);
    expect(owns(bought, deal.kind, deal.id)).toBe(true);
    expect(bought[CATALOG[deal.kind].equipped]).toBe(deal.id);
    expect(dailyDeal(bought, today)).toBeNull();
    expect(buyDeal({ ...bought, wallet: 9999 }, today)).toBeNull();
    expect(dailyDeal(bought, day(MONDAY + 1))).not.toBeNull();
    expect(buyDeal(saveWith({ wallet: deal.price - 1 }), today)).toBeNull();
  });

  it('is empty once everything is owned', () => {
    expect(dailyDeal(everything(), today)).toBeNull();
  });
});

describe('bundles', () => {
  const starter = BUNDLES[0];

  it('prices the bundle with its discount and grants every item', () => {
    const offer = bundleOffer(saveWith(), starter);
    expect(offer.missing).toHaveLength(starter.items.length);
    expect(offer.price).toBe(Math.round(offer.full * (1 - starter.discount)));
    const bought = buyBundle(saveWith({ wallet: offer.price }), starter.id)!;
    expect(bought.wallet).toBe(0);
    for (const it of starter.items) expect(owns(bought, it.kind, it.id)).toBe(true);
  });

  it('only charges for items still missing', () => {
    const [first, ...rest] = starter.items;
    const partial = saveWith({ [CATALOG[first.kind].owned]: ['classic', first.id] });
    const offer = bundleOffer(partial, starter);
    expect(offer.missing).toEqual(rest);
    expect(offer.full).toBe(rest.reduce((a, it) => a + priceOf(it.kind, it.id)!, 0));
  });

  it('refuses owned, unknown or unaffordable bundles', () => {
    expect(buyBundle(everything(), starter.id)).toBeNull();
    expect(buyBundle(saveWith({ wallet: 9999 }), 'nope')).toBeNull();
    expect(buyBundle(saveWith({ wallet: 1 }), starter.id)).toBeNull();
  });
});

describe('mystery box', () => {
  it('grants a random unowned item without equipping it', () => {
    const opened = openMysteryBox(saveWith({ wallet: MYSTERY_PRICE }), seededRng(3))!;
    expect(opened.save.wallet).toBe(0);
    expect(owns(opened.save, opened.prize.kind, opened.prize.id)).toBe(true);
    expect(opened.save[CATALOG[opened.prize.kind].equipped]).toBe('classic');
  });

  it('never repeats an item and favors cheaper items', () => {
    let save = saveWith({ wallet: MYSTERY_PRICE * 100 });
    const rng = seededRng(11);
    const seen = new Set<string>();
    const total = mysteryPool(save).length;
    for (let i = 0; i < total; i++) {
      const opened = openMysteryBox(save, rng, new Date(2026, 0, 1 + i))!;
      const key = `${opened.prize.kind}:${opened.prize.id}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
      save = opened.save;
    }
    expect(mysteryPool(save)).toHaveLength(0);
    expect(openMysteryBox(save, rng, new Date(2027, 0, 1))).toBeNull();

    let cheap = 0;
    for (let s = 0; s < 400; s++) {
      const { prize } = openMysteryBox(saveWith({ wallet: MYSTERY_PRICE }), seededRng(s))!;
      if (priceOf(prize.kind, prize.id)! <= 300) cheap++;
    }
    expect(cheap / 400).toBeGreaterThan(0.45);
  });

  it('opens at most once per day', () => {
    const today = day(MONDAY);
    const first = openMysteryBox(saveWith({ wallet: MYSTERY_PRICE * 3 }), seededRng(1), today)!;
    expect(boxOpenedToday(first.save, today)).toBe(true);
    expect(first.save.boxDay).toBe(dayKey(today));
    expect(openMysteryBox(first.save, seededRng(2), day(MONDAY, 23))).toBeNull();
    expect(boxOpenedToday(first.save, day(MONDAY + 1))).toBe(false);
    const tomorrow = openMysteryBox(first.save, seededRng(2), day(MONDAY + 1))!;
    expect(tomorrow.save.wallet).toBe(MYSTERY_PRICE);
  });

  it('refuses when the wallet is short', () => {
    expect(openMysteryBox(saveWith({ wallet: MYSTERY_PRICE - 1 }))).toBeNull();
  });
});

describe('save data for the shop', () => {
  it('validates themes, boosts and the deal day', () => {
    const s = normalizeSave({ themes: ['lava', 'nope'], theme: 'lava', boosts: { shield: 50, coins2x: -2, hack: 3 }, dealDay: 7, boxDay: '2026-6-8' });
    expect(s.boxDay).toBe('2026-6-8');
    expect(s.themes).toEqual(['classic', 'lava']);
    expect(s.theme).toBe('lava');
    expect(s.boosts).toEqual({ shield: 9 });
    expect(s.dealDay).toBe('');
    expect(normalizeSave({ theme: 'neon' }).theme).toBe('classic');
  });

  it('counts down to midnight as hh:mm:ss', () => {
    expect(countdownToTomorrow(new Date(2026, 5, 8, 22, 15, 0))).toBe('01:45:00');
    expect(countdownToTomorrow(new Date(2026, 5, 8, 23, 59, 58, 500))).toBe('00:00:02');
    expect(countdownToTomorrow(new Date(2026, 5, 8, 0, 0, 0))).toBe('24:00:00');
  });
});
