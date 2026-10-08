-- Season pass claims. Run with scripts/test-db.sh.
\set fay '''00000000-0000-4000-8000-0000000000f1'''
insert into auth.users (id) values (:fay);

set role authenticated;
select tests.login(:fay);
insert into public.ledger (id, user_id, kind, source, amount, wallet_after, detail) values
  ('a0000000-0000-4000-8000-000000000001', :fay, 'earn', 'season', 180, 180, '{"season": "s1", "tiers": [1, 3, 4]}'),
  ('a0000000-0000-4000-8000-000000000002', :fay, 'earn', 'season', 50, 230, '{"season": "s1", "tiers": [1]}'),
  ('a0000000-0000-4000-8000-000000000003', :fay, 'earn', 'season', 999, 999, '{"season": "s1", "tiers": [5]}'),
  ('a0000000-0000-4000-8000-000000000004', :fay, 'earn', 'season', 60, 60, '{"season": "s1", "tiers": [2]}'),
  ('a0000000-0000-4000-8000-000000000005', :fay, 'earn', 'season', 300, 300, '{"season": "s1", "tiers": [7, 7]}'),
  ('a0000000-0000-4000-8000-000000000006', :fay, 'earn', 'season', 50, 50, '{"season": "s9", "tiers": [1]}'),
  ('a0000000-0000-4000-8000-000000000007', :fay, 'earn', 'season', 500, 500, '{"season": "s1", "tiers": [30]}'),
  ('a0000000-0000-4000-8000-000000000008', :fay, 'earn', 'season', 50, 50, '{"season": "s1"}');
reset role;

select tests.check(
  (select array_agg(right(id::text, 1) order by id) = array['1', '7'] from public.ledger where source = 'season' and not suspicious),
  'valid claims pass; repeats, wrong amounts, coinless tiers, duplicates, unknown seasons and missing tiers are flagged'
);
select tests.check((select note = 'season tier already claimed' from public.ledger where id = 'a0000000-0000-4000-8000-000000000002'), 'repeat claims explain why');
select tests.check((select note = 'tiers without coins' from public.ledger where id = 'a0000000-0000-4000-8000-000000000004'), 'boost tiers pay no coins');
select tests.check((select note = 'season is over' from public.ledger where id = 'a0000000-0000-4000-8000-000000000006'), 'unknown seasons are closed');

-- After the claim deadline, even valid claims are flagged.
update public.catalog_settings set value = extract(epoch from now()) - 1 where key = 'season_s1_claims_until';
set role authenticated;
select tests.login(:fay);
insert into public.ledger (id, user_id, kind, source, amount, wallet_after, detail) values
  ('a0000000-0000-4000-8000-000000000009', :fay, 'earn', 'season', 150, 650, '{"season": "s1", "tiers": [5]}');
reset role;
select tests.check((select note = 'season is over' from public.ledger where id = 'a0000000-0000-4000-8000-000000000009'), 'late claims are flagged');

-- Exclusive cosmetics are in the catalog but cannot be bought.
select tests.check((select count(*) = 3 and bool_and(price = 0) from public.catalog_items where id in ('deeporbit', 'stardust')), 'exclusives are listed at no price');
set role authenticated;
select tests.login(:fay);
insert into public.ledger (id, user_id, kind, source, amount, wallet_after, detail) values
  ('a0000000-0000-4000-8000-00000000000a', :fay, 'spend', 'cosmetic', 1, 649, '{"items": [{"kind": "skin", "id": "deeporbit"}]}');
reset role;
select tests.check((select suspicious from public.ledger where id = 'a0000000-0000-4000-8000-00000000000a'), 'buying an exclusive is flagged');
