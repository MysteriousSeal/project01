import { describe, expect, it } from '@jest/globals';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { BOOSTS, buyBoost } from '../../src/game/meta/boosts';
import { CATALOG_BEGIN, CATALOG_END, catalogSeedSql } from '../../src/game/meta/catalogSql';
import { CATALOG, COSMETIC_KINDS } from '../../src/game/meta/cosmetics';
import { claimDaily } from '../../src/game/meta/dailyReward';
import { diffLedger, LedgerEntry, openingEntry } from '../../src/game/meta/ledger';
import { BUNDLES, buyBundle, buyDeal, DEAL_DISCOUNT, discounted, MYSTERY_PRICE, openMysteryBox } from '../../src/game/meta/offers';
import { normalizeSave, Save } from '../../src/game/meta/save';
import { buyCosmetic, buyUpgrade, equipCosmetic, OfferItem, priceOf } from '../../src/game/meta/shop';
import { UPGRADES } from '../../src/game/meta/upgrades';
import { seededRng } from '../../src/game/sim/rng';
import { day, MONDAY, saveWith } from '../helpers';

let n = 0;
const id = () => `id-${++n}`;
const rich = (patch: Partial<Save> = {}) => saveWith({ wallet: 100_000, ...patch });

const exactRound = (num: number, den: number) => Math.floor((2 * num + den) / (2 * den));

function serverExpected(e: LedgerEntry): number | null {
  const items = (e.detail.items as OfferItem[] | undefined) ?? [];
  const base = items.reduce((a, it) => a + (priceOf(it.kind, it.id) ?? NaN), 0);
  switch (e.source) {
    case 'cosmetic':
      return items.length ? base : null;
    case 'deal':
      return Math.max(1, exactRound(base * Math.round((1 - DEAL_DISCOUNT) * 100), 100));
    case 'bundle': {
      const b = BUNDLES.find((x) => x.id === e.detail.bundle);
      return b ? Math.max(1, exactRound(base * Math.round((1 - b.discount) * 100), 100)) : null;
    }
    case 'box':
      return MYSTERY_PRICE;
    case 'upgrade':
      return UPGRADES.find((u) => u.id === e.detail.id)?.costs[(e.detail.level as number) - 1] ?? null;
    case 'boost':
      return BOOSTS.find((b) => b.id === e.detail.id)?.price ?? null;
    default:
      return null;
  }
}

const spendOf = (prev: Save, next: Save | null) => {
  expect(next).not.toBeNull();
  const entries = diffLedger(prev, next!, { source: 'shop' }, id);
  expect(entries).toHaveLength(1);
  const [e] = entries;
  expect(e.kind).toBe('spend');
  expect(e.amount).toBe(prev.wallet - next!.wallet);
  expect(e.wallet_after).toBe(next!.wallet);
  expect(serverExpected(e)).toBe(e.amount);
  return e;
};

describe('ledger entries from save changes', () => {
  it('records nothing when the wallet is unchanged', () => {
    const s = saveWith({ skins: ['classic', 'ember'] });
    expect(diffLedger(s, equipCosmetic(s, 'skin', 'ember')!, { source: 'shop' }, id)).toEqual([]);
  });

  it('records run earnings with the run id', () => {
    const [e] = diffLedger(saveWith({ wallet: 10 }), saveWith({ wallet: 35 }), { source: 'run', runId: 'run-7' }, id);
    expect(e).toMatchObject({ kind: 'earn', source: 'run', amount: 25, wallet_after: 35, detail: { run_id: 'run-7' } });
  });

  it('records daily rewards and developer grants', () => {
    const prev = saveWith({ wallet: 5 });
    const claimed = claimDaily(prev, day(MONDAY))!;
    expect(diffLedger(prev, claimed, { source: 'daily_reward' }, id)[0]).toMatchObject({ source: 'daily_reward', amount: claimed.wallet - 5 });
    expect(diffLedger(prev, { ...prev, wallet: 105 }, { source: 'dev' }, id)[0]).toMatchObject({ source: 'dev', amount: 100 });
  });

  it('prices every cosmetic exactly like the server', () => {
    for (const kind of COSMETIC_KINDS)
      for (const item of CATALOG[kind].items.filter((i) => i.price > 0)) {
        const prev = rich();
        expect(spendOf(prev, buyCosmetic(prev, kind, item.id)).source).toBe('cosmetic');
      }
  });

  it('prices deals, bundles, boxes, boosts and upgrades exactly like the server', () => {
    const prev = rich();
    expect(spendOf(prev, buyDeal(prev, day(MONDAY))).source).toBe('deal');
    for (const b of BUNDLES) {
      const e = spendOf(prev, buyBundle(prev, b.id));
      expect(e).toMatchObject({ source: 'bundle', detail: { bundle: b.id, complete: true } });
      const [first] = b.items;
      const partial = rich({ [CATALOG[first.kind].owned]: ['classic', first.id] });
      expect(spendOf(partial, buyBundle(partial, b.id)).detail).toMatchObject({ bundle: b.id, complete: false });
    }
    expect(spendOf(prev, openMysteryBox(prev, seededRng(1), day(MONDAY))?.save ?? null).source).toBe('box');
    for (const b of BOOSTS) expect(spendOf(prev, buyBoost(prev, b.id)).source).toBe('boost');
    for (const u of UPGRADES) {
      let s = prev;
      for (let lvl = 1; lvl <= u.costs.length; lvl++) {
        const next = buyUpgrade(s, u.id);
        expect(spendOf(s, next).detail).toEqual({ id: u.id, level: lvl });
        s = next!;
      }
    }
  });

  it('starts the ledger with the current wallet', () => {
    expect(openingEntry(saveWith({ wallet: 420 }), 'o1')).toEqual({ id: 'o1', kind: 'earn', source: 'opening', amount: 420, wallet_after: 420, detail: {} });
    expect(normalizeSave({ ledgerStarted: true }).ledgerStarted).toBe(true);
    expect(normalizeSave({ ledgerStarted: 'yes' }).ledgerStarted).toBe(false);
  });
});

describe('discount math', () => {
  it('rounds exactly like Postgres for every price and discount', () => {
    const discounts = [DEAL_DISCOUNT, ...BUNDLES.map((b) => b.discount)];
    for (const d of discounts)
      for (let price = 1; price <= 10_000; price++) expect(discounted(price, d)).toBe(Math.max(1, exactRound(price * Math.round((1 - d) * 100), 100)));
  });

  it('only uses whole-percent discounts', () => {
    for (const d of [DEAL_DISCOUNT, ...BUNDLES.map((b) => b.discount)]) expect(Number.isInteger(Math.round(d * 1000) / 10)).toBe(true);
  });
});

describe('server catalog', () => {
  it('matches the newest generated block in the migrations', () => {
    const dir = join(__dirname, '../../supabase/migrations');
    const latest = readdirSync(dir)
      .filter((f) => f.endsWith('.sql'))
      .sort()
      .map((f) => readFileSync(join(dir, f), 'utf8'))
      .filter((sql) => sql.includes(CATALOG_BEGIN))
      .pop();
    expect(latest).toBeDefined();
    const block = latest!.slice(latest!.indexOf(CATALOG_BEGIN), latest!.indexOf(CATALOG_END) + CATALOG_END.length);
    if (block !== catalogSeedSql()) {
      throw new Error(`The server catalog is out of date. Add a new migration containing:\n\n${catalogSeedSql()}\n`);
    }
  });
});
