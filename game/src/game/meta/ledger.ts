import { BOOSTS } from './boosts';
import { CATALOG, COSMETIC_KINDS } from './cosmetics';
import { BUNDLES } from './offers';
import { tierOf, TROPHIES, TROPHY_TIERS } from './trophies';
import type { Save } from './save';
import type { OfferItem } from './shop';
import { UPGRADES } from './upgrades';

export type LedgerSource = 'opening' | 'run' | 'daily_reward' | 'trophy' | 'dev' | 'cosmetic' | 'deal' | 'bundle' | 'box' | 'boost' | 'upgrade' | 'revive';

export type LedgerEntry = {
  id: string;
  kind: 'earn' | 'spend';
  source: LedgerSource;
  amount: number;
  wallet_after: number;
  detail: Record<string, unknown>;
};

export type ChangeReason = { source: 'run'; runId: string } | { source: 'daily_reward' } | { source: 'trophy' } | { source: 'revive'; runId: string; count: number } | { source: 'dev' } | { source: 'shop' } | { source: 'other' };

const gainedItems = (prev: Save, next: Save): OfferItem[] =>
  COSMETIC_KINDS.flatMap((kind) => {
    const { owned } = CATALOG[kind];
    return next[owned].filter((id) => !prev[owned].includes(id)).map((id) => ({ kind, id }));
  });

const gainedUpgrade = (prev: Save, next: Save) => {
  const u = UPGRADES.find((x) => (next.upgrades[x.id] ?? 0) > (prev.upgrades[x.id] ?? 0));
  return u ? { id: u.id, level: next.upgrades[u.id] } : null;
};

const gainedBoost = (prev: Save, next: Save) => BOOSTS.find((b) => (next.boosts[b.id] ?? 0) > (prev.boosts[b.id] ?? 0))?.id ?? null;

const sameItems = (a: OfferItem[], b: OfferItem[]) => a.length === b.length && a.every((x) => b.some((y) => y.kind === x.kind && y.id === x.id));

function spendEntry(prev: Save, next: Save, amount: number): Pick<LedgerEntry, 'source' | 'detail'> {
  const items = gainedItems(prev, next);
  if (next.boxDay !== prev.boxDay) return { source: 'box', detail: { items } };
  if (next.dealDay !== prev.dealDay) return { source: 'deal', detail: { items } };
  if (items.length > 1) {
    const bundle = BUNDLES.find((b) => items.every((it) => b.items.some((x) => x.kind === it.kind && x.id === it.id)));
    return { source: 'bundle', detail: { items, bundle: bundle?.id ?? null, complete: bundle ? sameItems(items, bundle.items) : false } };
  }
  if (items.length === 1) return { source: 'cosmetic', detail: { items } };
  const upgrade = gainedUpgrade(prev, next);
  if (upgrade) return { source: 'upgrade', detail: upgrade };
  const boost = gainedBoost(prev, next);
  if (boost) return { source: 'boost', detail: { id: boost } };
  return { source: 'cosmetic', detail: { items: [], unexplained: amount } };
}

export type TrophyTier = { id: string; tier: number };

const gainedTrophies = (prev: Save, next: Save): TrophyTier[] =>
  TROPHIES.flatMap((t) => {
    const out: TrophyTier[] = [];
    for (let tier = tierOf(prev, t.id) + 1; tier <= tierOf(next, t.id); tier++) out.push({ id: t.id, tier });
    return out;
  });

/** Ledger entries for a save change. Trophy coins always get their own entry so the server can check them. */
export function diffLedger(prev: Save, next: Save, reason: ChangeReason, newId: () => string): LedgerEntry[] {
  const trophies = gainedTrophies(prev, next);
  const trophyCoins = trophies.reduce((a, t) => a + TROPHY_TIERS[t.tier - 1].reward, 0);
  const rest = walletEntries(prev, next, next.wallet - trophyCoins, reason, newId);
  if (!trophyCoins) return rest;
  return [...rest, { id: newId(), kind: 'earn', source: 'trophy', amount: trophyCoins, wallet_after: next.wallet, detail: { trophies } }];
}

function walletEntries(prev: Save, next: Save, walletAfter: number, reason: ChangeReason, newId: () => string): LedgerEntry[] {
  const delta = walletAfter - prev.wallet;
  if (delta === 0) return [];
  const base = { id: newId(), wallet_after: walletAfter };
  if (delta < 0 && reason.source === 'revive') return [{ ...base, kind: 'spend', amount: -delta, source: 'revive', detail: { run_id: reason.runId, count: reason.count } }];
  if (delta < 0) return [{ ...base, kind: 'spend', amount: -delta, ...spendEntry(prev, next, -delta) }];
  switch (reason.source) {
    case 'run':
      return [{ ...base, kind: 'earn', source: 'run', amount: delta, detail: { run_id: reason.runId } }];
    case 'daily_reward':
      return [{ ...base, kind: 'earn', source: 'daily_reward', amount: delta, detail: { streak: next.streak } }];
    default:
      return [{ ...base, kind: 'earn', source: 'dev', amount: delta, detail: { reason: reason.source } }];
  }
}

export const openingEntry = (save: Save, id: string): LedgerEntry => ({ id, kind: 'earn', source: 'opening', amount: save.wallet, wallet_after: save.wallet, detail: {} });
