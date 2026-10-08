import { BOOSTS } from './boosts';
import { CATALOG, COSMETIC_KINDS } from './cosmetics';
import { DAILY_REWARD_MAX } from './dailyReward';
import { BUNDLES, DEAL_DISCOUNT, MYSTERY_PRICE } from './offers';
import { RUN_BONUS_MAX } from './progress';
import { REVIVE_PRICES } from './revive';
import { TROPHY_TIERS } from './trophies';
import { UPGRADES } from './upgrades';

export const CATALOG_BEGIN = '-- BEGIN GENERATED CATALOG';
export const CATALOG_END = '-- END GENERATED CATALOG';

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;

const insert = (table: string, columns: string[], rows: (string | number)[][], conflict: string, update: string[]) =>
  [
    `insert into public.${table} (${columns.join(', ')}) values`,
    rows.map((r) => `  (${r.map((v) => (typeof v === 'number' ? String(v) : q(v))).join(', ')})`).join(',\n'),
    `on conflict (${conflict}) do ${update.length ? `update set ${update.map((c) => `${c} = excluded.${c}`).join(', ')}` : 'nothing'};`,
  ].join('\n');

export function catalogSeedSql() {
  const items = COSMETIC_KINDS.flatMap((kind) => CATALOG[kind].items.map((i) => [kind, i.id, i.price]));
  const upgrades = UPGRADES.flatMap((u) => u.costs.map((cost, i) => [u.id, i + 1, cost]));
  return [
    CATALOG_BEGIN,
    insert('catalog_items', ['kind', 'id', 'price'], items, 'kind, id', ['price']),
    insert('catalog_upgrades', ['id', 'level', 'cost'], upgrades, 'id, level', ['cost']),
    insert('catalog_boosts', ['id', 'price'], BOOSTS.map((b) => [b.id, b.price]), 'id', ['price']),
    insert('catalog_bundles', ['id', 'discount'], BUNDLES.map((b) => [b.id, b.discount]), 'id', ['discount']),
    insert('catalog_bundle_items', ['bundle_id', 'kind', 'item_id'], BUNDLES.flatMap((b) => b.items.map((it) => [b.id, it.kind, it.id])), 'bundle_id, kind, item_id', []),
    insert('catalog_settings', ['key', 'value'], [['deal_discount', DEAL_DISCOUNT], ['box_price', MYSTERY_PRICE], ['daily_reward_max', DAILY_REWARD_MAX], ['run_bonus_max', RUN_BONUS_MAX], ...TROPHY_TIERS.map((t, i) => [`trophy_tier_${i + 1}`, t.reward]), ...REVIVE_PRICES.map((p, i) => [`revive_price_${i + 1}`, p])], 'key', ['value']),
    CATALOG_END,
  ].join('\n\n');
}
