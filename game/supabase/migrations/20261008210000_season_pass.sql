-- Season pass: claimed tier coins get their own ledger entries, checked against the season's
-- catalog rows, and refused after the season's claim deadline.
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
  ('skin', 'deeporbit', 0),
  ('trail', 'classic', 0),
  ('trail', 'pixel', 120),
  ('trail', 'bubbles', 180),
  ('trail', 'ghost', 220),
  ('trail', 'sparkle', 350),
  ('trail', 'flame', 450),
  ('trail', 'comet', 550),
  ('trail', 'rainbow', 850),
  ('trail', 'stardust', 0),
  ('theme', 'classic', 0),
  ('theme', 'candy', 160),
  ('theme', 'lava', 300),
  ('theme', 'iceworld', 450),
  ('theme', 'neon', 700),
  ('theme', 'mono', 1000),
  ('theme', 'deeporbit', 0)
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
  ('daily_reward_max', 85),
  ('run_bonus_max', 10000),
  ('trophy_tier_1', 25),
  ('trophy_tier_2', 75),
  ('trophy_tier_3', 200),
  ('trophy_tier_4', 400),
  ('trophy_tier_5', 750),
  ('revive_price_1', 50),
  ('revive_price_2', 150),
  ('season_s1_tier_1', 50),
  ('season_s1_tier_3', 60),
  ('season_s1_tier_4', 70),
  ('season_s1_tier_5', 150),
  ('season_s1_tier_7', 80),
  ('season_s1_tier_8', 90),
  ('season_s1_tier_11', 100),
  ('season_s1_tier_13', 110),
  ('season_s1_tier_14', 120),
  ('season_s1_tier_15', 250),
  ('season_s1_tier_17', 130),
  ('season_s1_tier_18', 140),
  ('season_s1_tier_21', 150),
  ('season_s1_tier_23', 160),
  ('season_s1_tier_24', 170),
  ('season_s1_tier_25', 400),
  ('season_s1_tier_27', 180),
  ('season_s1_tier_28', 190),
  ('season_s1_tier_30', 500),
  ('season_s1_claims_until', 1799409600)
on conflict (key) do update set value = excluded.value;

-- END GENERATED CATALOG

alter table public.ledger drop constraint ledger_source;
alter table public.ledger add constraint ledger_source
  check (source in ('opening', 'run', 'daily_reward', 'trophy', 'season', 'dev', 'cosmetic', 'deal', 'bundle', 'box', 'boost', 'upgrade', 'revive'));

create or replace function public.check_ledger_entry() returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  uuid_pattern constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  expected numeric;
  total integer;
  known integer;
  distinct_items integer;
  base numeric;
  run_coins integer;
  items jsonb := coalesce(new.detail -> 'items', '[]'::jsonb);
  tiers jsonb := new.detail -> 'trophies';
begin
  new.note := null;

  if new.source in ('cosmetic', 'deal', 'bundle', 'box') then
    if jsonb_typeof(items) <> 'array' then
      new.note := 'items must be a list';
    else
      select count(*), count(c.id), coalesce(sum(c.price), 0)
        into total, known, base
        from jsonb_to_recordset(items) as x (kind text, id text)
        left join public.catalog_items c on c.kind = x.kind and c.id = x.id;
      if total = 0 or known < total then
        new.note := 'unknown items';
      elsif new.source = 'cosmetic' then
        expected := base;
      elsif new.source = 'deal' then
        expected := greatest(1, round(base * (1 - public.catalog_value('deal_discount'))));
      elsif new.source = 'bundle' then
        expected := greatest(1, round(base * (1 - (select b.discount from public.catalog_bundles b where b.id = new.detail ->> 'bundle'))));
      else
        expected := public.catalog_value('box_price');
      end if;
    end if;

  elsif new.source = 'upgrade' then
    if coalesce(new.detail ->> 'level', '') ~ '^[0-9]{1,3}$' then
      select u.cost into expected from public.catalog_upgrades u where u.id = new.detail ->> 'id' and u.level = (new.detail ->> 'level')::integer;
    end if;

  elsif new.source = 'boost' then
    select b.price into expected from public.catalog_boosts b where b.id = new.detail ->> 'id';

  elsif new.source = 'revive' then
    if coalesce(new.detail ->> 'run_id', '') !~ uuid_pattern or coalesce(new.detail ->> 'count', '') !~ '^[0-9]{1,2}$' then
      new.note := 'revive needs a run id and count';
    elsif exists (
      select 1 from public.ledger l
      where l.user_id = new.user_id and l.source = 'revive'
        and l.detail ->> 'run_id' = new.detail ->> 'run_id' and l.detail ->> 'count' = new.detail ->> 'count'
    ) then
      new.note := 'revive already paid';
    else
      expected := public.catalog_value('revive_price_' || (new.detail ->> 'count'));
      if expected is null then
        new.note := 'too many revives';
      end if;
    end if;

  elsif new.source = 'trophy' then
    if jsonb_typeof(tiers) <> 'array' or jsonb_array_length(tiers) = 0 then
      new.note := 'trophies must be a list';
    else
      select count(*), count(s.value), count(distinct (x.id, x.tier)), coalesce(sum(s.value), 0)
        into total, known, distinct_items, expected
        from jsonb_to_recordset(tiers) as x (id text, tier integer)
        left join public.catalog_settings s on s.key = 'trophy_tier_' || x.tier and x.id ~ '^[A-Za-z]{1,32}$';
      if known < total then
        new.note := 'unknown trophy tiers';
      elsif distinct_items < total then
        new.note := 'trophy tier listed twice';
      elsif exists (
        select 1
        from public.ledger l, jsonb_to_recordset(l.detail -> 'trophies') as paid (id text, tier integer),
          jsonb_to_recordset(tiers) as x (id text, tier integer)
        where l.user_id = new.user_id and l.source = 'trophy' and jsonb_typeof(l.detail -> 'trophies') = 'array'
          and paid.id = x.id and paid.tier = x.tier
      ) then
        new.note := 'trophy tier already rewarded';
      elsif new.amount <> expected then
        new.note := 'trophy reward mismatch, expected ' || expected::text;
      end if;
      expected := null;
    end if;

  elsif new.source = 'season' then
    tiers := new.detail -> 'tiers';
    if coalesce(new.detail ->> 'season', '') !~ '^[a-z0-9]{1,16}$' or jsonb_typeof(tiers) <> 'array' or jsonb_array_length(tiers) = 0 then
      new.note := 'season claims need a season and tiers';
    elsif now() > to_timestamp(public.catalog_value('season_' || (new.detail ->> 'season') || '_claims_until')) is not false then
      new.note := 'season is over';
    else
      select count(*), count(s.value), count(distinct x.tier), coalesce(sum(s.value), 0)
        into total, known, distinct_items, expected
        from jsonb_array_elements_text(tiers) as x (tier)
        left join public.catalog_settings s on s.key = 'season_' || (new.detail ->> 'season') || '_tier_' || x.tier;
      if known < total then
        new.note := 'tiers without coins';
      elsif distinct_items < total then
        new.note := 'tier listed twice';
      elsif exists (
        select 1
        from public.ledger l, jsonb_array_elements_text(l.detail -> 'tiers') as paid (tier), jsonb_array_elements_text(tiers) as x (tier)
        where l.user_id = new.user_id and l.source = 'season' and l.detail ->> 'season' = new.detail ->> 'season'
          and jsonb_typeof(l.detail -> 'tiers') = 'array' and paid.tier = x.tier
      ) then
        new.note := 'season tier already claimed';
      elsif new.amount <> expected then
        new.note := 'season reward mismatch, expected ' || expected::text;
      end if;
      expected := null;
    end if;

  elsif new.source = 'run' then
    if coalesce(new.detail ->> 'run_id', '') ~ uuid_pattern then
      select r.coins into run_coins from public.runs r where r.id = (new.detail ->> 'run_id')::uuid and r.user_id = new.user_id;
    end if;
    if run_coins is null then
      new.note := 'run not logged';
    elsif new.amount > run_coins + public.catalog_value('run_bonus_max') then
      new.note := 'earned more than the run allows';
    end if;

  elsif new.source = 'daily_reward' then
    if new.amount > public.catalog_value('daily_reward_max') then
      new.note := 'daily reward too large';
    end if;

  elsif new.source = 'dev' then
    new.note := 'developer grant';

  elsif new.source = 'opening' then
    if new.amount > 100000 then
      new.note := 'opening balance too large';
    end if;
  end if;

  -- Every spend must match a price, whether from the catalog or computed above.
  if new.kind = 'spend' and new.note is null and (expected is null or new.amount <> expected) then
    new.note := 'price mismatch, expected ' || coalesce(expected::text, 'an unknown price');
  end if;

  new.suspicious := new.note is not null;
  return new;
end;
$$;
