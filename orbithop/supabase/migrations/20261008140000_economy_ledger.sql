-- Server-side price list, mirrored from the game catalog (see the generated block at the end).
create table public.catalog_items (
  kind text not null,
  id text not null,
  price integer not null check (price >= 0),
  primary key (kind, id)
);

create table public.catalog_upgrades (
  id text not null,
  level integer not null check (level > 0),
  cost integer not null check (cost > 0),
  primary key (id, level)
);

create table public.catalog_boosts (
  id text primary key,
  price integer not null check (price > 0)
);

create table public.catalog_bundles (
  id text primary key,
  discount numeric not null check (discount >= 0 and discount < 1)
);

create table public.catalog_bundle_items (
  bundle_id text not null references public.catalog_bundles (id) on delete cascade,
  kind text not null,
  item_id text not null,
  primary key (bundle_id, kind, item_id),
  foreign key (kind, item_id) references public.catalog_items (kind, id)
);

create table public.catalog_settings (
  key text primary key,
  value numeric not null
);

alter table public.catalog_items enable row level security;
alter table public.catalog_upgrades enable row level security;
alter table public.catalog_boosts enable row level security;
alter table public.catalog_bundles enable row level security;
alter table public.catalog_bundle_items enable row level security;
alter table public.catalog_settings enable row level security;

create policy "Catalog is public" on public.catalog_items for select to anon, authenticated using (true);
create policy "Catalog is public" on public.catalog_upgrades for select to anon, authenticated using (true);
create policy "Catalog is public" on public.catalog_boosts for select to anon, authenticated using (true);
create policy "Catalog is public" on public.catalog_bundles for select to anon, authenticated using (true);
create policy "Catalog is public" on public.catalog_bundle_items for select to anon, authenticated using (true);
create policy "Catalog is public" on public.catalog_settings for select to anon, authenticated using (true);

-- Every coin movement. Entries come from the game; the trigger below checks them against the catalog.
create table public.ledger (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  source text not null,
  amount integer not null,
  wallet_after integer not null,
  detail jsonb not null default '{}'::jsonb,
  suspicious boolean not null default false,
  note text,
  created_at timestamptz not null default now(),
  constraint ledger_kind check (kind in ('earn', 'spend')),
  constraint ledger_source check (source in ('opening', 'run', 'daily_reward', 'dev', 'cosmetic', 'deal', 'bundle', 'box', 'boost', 'upgrade')),
  constraint ledger_kind_matches_source check ((kind = 'spend') = (source in ('cosmetic', 'deal', 'bundle', 'box', 'boost', 'upgrade'))),
  constraint ledger_amount check (amount > 0 and amount <= 1000000),
  constraint ledger_wallet check (wallet_after >= 0),
  constraint ledger_detail check (jsonb_typeof(detail) = 'object' and octet_length(detail::text) <= 4096)
);

create unique index ledger_one_opening on public.ledger (user_id) where source = 'opening';
create index ledger_user on public.ledger (user_id, created_at desc);
create index ledger_suspicious on public.ledger (created_at desc) where suspicious;

alter table public.ledger enable row level security;

create policy "Players can record their own coins"
  on public.ledger for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Players can read their own coins"
  on public.ledger for select to authenticated
  using ((select auth.uid()) = user_id);

create function public.check_ledger_entry() returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  expected numeric;
  total integer;
  known integer;
  base numeric;
  run_coins integer;
  items jsonb := coalesce(new.detail -> 'items', '[]'::jsonb);
begin
  new.note := null;

  if new.kind = 'spend' then
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
          expected := greatest(1, round(base * (1 - (select s.value from public.catalog_settings s where s.key = 'deal_discount'))));
        elsif new.source = 'bundle' then
          expected := greatest(1, round(base * (1 - (select b.discount from public.catalog_bundles b where b.id = new.detail ->> 'bundle'))));
        else
          expected := (select s.value from public.catalog_settings s where s.key = 'box_price');
        end if;
      end if;
    elsif new.source = 'upgrade' and (new.detail ->> 'level') ~ '^[0-9]{1,3}$' then
      select u.cost into expected from public.catalog_upgrades u where u.id = new.detail ->> 'id' and u.level = (new.detail ->> 'level')::integer;
    elsif new.source = 'boost' then
      select b.price into expected from public.catalog_boosts b where b.id = new.detail ->> 'id';
    end if;
    if new.note is null and (expected is null or new.amount <> expected) then
      new.note := 'price mismatch, expected ' || coalesce(expected::text, 'an unknown price');
    end if;

  elsif new.source = 'run' then
    if (new.detail ->> 'run_id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      select r.coins into run_coins from public.runs r where r.id = (new.detail ->> 'run_id')::uuid and r.user_id = new.user_id;
    end if;
    if run_coins is null then
      new.note := 'run not logged';
    elsif new.amount > run_coins + 2000 then
      new.note := 'earned more than the run allows';
    end if;

  elsif new.source = 'daily_reward' then
    if new.amount > 85 then
      new.note := 'daily reward too large';
    end if;

  elsif new.source = 'dev' then
    new.note := 'developer grant';

  elsif new.source = 'opening' then
    if new.amount > 100000 then
      new.note := 'opening balance too large';
    end if;
  end if;

  new.suspicious := new.note is not null;
  return new;
end;
$$;

create trigger ledger_check
  before insert on public.ledger
  for each row execute function public.check_ledger_entry();

-- Balance the ledger supports, ignoring suspicious entries. Players only see their own row.
create view public.wallet_balances with (security_invoker = true) as
select
  l.user_id,
  coalesce(sum(case when l.kind = 'earn' then l.amount else -l.amount end) filter (where not l.suspicious), 0) as balance,
  count(*) filter (where l.suspicious) as suspicious_entries
from public.ledger l
group by l.user_id;

-- Admin-only: players whose cloud wallet is higher than their ledger supports, or with suspicious entries.
create function public.economy_audit(min_gap integer default 1)
returns table (user_id uuid, display_name text, save_wallet bigint, ledger_balance bigint, gap bigint, suspicious_entries bigint)
language sql
stable
security definer
set search_path = ''
as $$
  with balances as (
    select l.user_id,
      coalesce(sum(case when l.kind = 'earn' then l.amount else -l.amount end) filter (where not l.suspicious), 0) as balance,
      count(*) filter (where l.suspicious) as suspicious_entries
    from public.ledger l
    group by l.user_id
  )
  select s.user_id, p.display_name, w.wallet, coalesce(b.balance, 0), w.wallet - coalesce(b.balance, 0), coalesce(b.suspicious_entries, 0)
  from public.saves s
  cross join lateral (select coalesce((s.data ->> 'wallet')::numeric, 0)::bigint as wallet) w
  left join balances b on b.user_id = s.user_id
  left join public.profiles p on p.user_id = s.user_id
  where w.wallet - coalesce(b.balance, 0) >= min_gap or coalesce(b.suspicious_entries, 0) > 0
  order by w.wallet - coalesce(b.balance, 0) desc
$$;

revoke execute on function public.economy_audit(integer) from public, anon, authenticated;

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
  ('box_price', 250)
on conflict (key) do update set value = excluded.value;

-- END GENERATED CATALOG
