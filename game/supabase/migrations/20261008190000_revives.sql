-- Revives: spending coins to continue a run, checked against the catalog price for that revive.
alter table public.ledger drop constraint ledger_source;
alter table public.ledger add constraint ledger_source
  check (source in ('opening', 'run', 'daily_reward', 'trophy', 'dev', 'cosmetic', 'deal', 'bundle', 'box', 'boost', 'upgrade', 'revive'));

alter table public.ledger drop constraint ledger_kind_matches_source;
alter table public.ledger add constraint ledger_kind_matches_source
  check ((kind = 'spend') = (source in ('cosmetic', 'deal', 'bundle', 'box', 'boost', 'upgrade', 'revive')));

-- ledger_check leaves revive entries unchecked; this trigger runs after it (name order).
create function public.check_revive_entry() returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  expected numeric;
begin
  if new.source <> 'revive' then
    return new;
  end if;

  -- ledger_check flags spends it has no price for; revives are priced here instead.
  new.note := null;
  if coalesce(new.detail ->> 'run_id', '') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     or coalesce(new.detail ->> 'count', '') !~ '^[0-9]{1,2}$' then
    new.note := 'revive needs a run id and count';
  else
    select s.value into expected from public.catalog_settings s where s.key = 'revive_price_' || (new.detail ->> 'count');
    if expected is null then
      new.note := 'too many revives';
    elsif new.amount <> expected then
      new.note := 'price mismatch, expected ' || expected::text;
    elsif exists (
      select 1 from public.ledger l
      where l.user_id = new.user_id and l.source = 'revive'
        and l.detail ->> 'run_id' = new.detail ->> 'run_id' and l.detail ->> 'count' = new.detail ->> 'count'
    ) then
      new.note := 'revive already paid';
    end if;
  end if;

  new.suspicious := new.note is not null;
  return new;
end;
$$;

create trigger ledger_revive_check
  before insert on public.ledger
  for each row execute function public.check_revive_entry();

-- BEGIN GENERATED CATALOG

insert into public.catalog_items (kind, id, price) values
  ('skin', 'classic', 0),
  ('skin', 'ember', 40),
  ('skin', 'mint', 80),
  ('skin', 'aqua', 120),
  ('skin', 'gold', 150),
  ('skin', 'cherry', 200),
  ('skin', 'violet', 250),
  ('skin', 'lime', 320),
  ('skin', 'ice', 400),
  ('skin', 'rose', 600),
  ('skin', 'galaxy', 750),
  ('skin', 'void', 900),
  ('skin', 'aurora', 1100),
  ('skin', 'sun', 1500),
  ('skin', 'obsidian', 2000),
  ('trail', 'classic', 0),
  ('trail', 'pixel', 120),
  ('trail', 'bubbles', 180),
  ('trail', 'ghost', 220),
  ('trail', 'sparkle', 350),
  ('trail', 'flame', 450),
  ('trail', 'comet', 550),
  ('trail', 'rainbow', 850),
  ('theme', 'classic', 0),
  ('theme', 'candy', 160),
  ('theme', 'lava', 300),
  ('theme', 'iceworld', 450),
  ('theme', 'neon', 700),
  ('theme', 'mono', 1000)
on conflict (kind, id) do update set price = excluded.price;

insert into public.catalog_upgrades (id, level, cost) values
  ('sturdy', 1, 120),
  ('sturdy', 2, 300),
  ('sturdy', 3, 600),
  ('sturdy', 4, 1000),
  ('magnet', 1, 100),
  ('magnet', 2, 250),
  ('magnet', 3, 500),
  ('fever', 1, 150),
  ('fever', 2, 350),
  ('fever', 3, 700),
  ('lucky', 1, 150),
  ('lucky', 2, 400),
  ('lucky', 3, 800),
  ('shield', 1, 900)
on conflict (id, level) do update set cost = excluded.cost;

insert into public.catalog_boosts (id, price) values
  ('shield', 120),
  ('coins2x', 150),
  ('headStart', 200)
on conflict (id) do update set price = excluded.price;

insert into public.catalog_bundles (id, discount) values
  ('starter', 0.5),
  ('speed', 0.4),
  ('collector', 0.35)
on conflict (id) do update set discount = excluded.discount;

insert into public.catalog_bundle_items (bundle_id, kind, item_id) values
  ('starter', 'skin', 'ember'),
  ('starter', 'trail', 'pixel'),
  ('starter', 'theme', 'candy'),
  ('speed', 'skin', 'cherry'),
  ('speed', 'trail', 'flame'),
  ('speed', 'theme', 'lava'),
  ('collector', 'skin', 'galaxy'),
  ('collector', 'skin', 'aurora'),
  ('collector', 'trail', 'rainbow'),
  ('collector', 'theme', 'neon')
on conflict (bundle_id, kind, item_id) do nothing;

insert into public.catalog_settings (key, value) values
  ('deal_discount', 0.5),
  ('box_price', 250),
  ('trophy_tier_1', 25),
  ('trophy_tier_2', 75),
  ('trophy_tier_3', 200),
  ('trophy_tier_4', 400),
  ('trophy_tier_5', 750),
  ('revive_price_1', 50),
  ('revive_price_2', 150)
on conflict (key) do update set value = excluded.value;

-- END GENERATED CATALOG
