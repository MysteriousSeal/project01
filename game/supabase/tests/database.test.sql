-- Database behavior tests. Run with scripts/test-db.sh.
create schema tests;
grant usage on schema tests to public;

create function tests.check(ok boolean, what text) returns void
  language plpgsql
as $$
begin
  if not coalesce(ok, false) then
    raise exception 'FAILED: %', what;
  end if;
end;
$$;

create function tests.login(who uuid) returns void
  language sql
as $$
  select set_config('request.jwt.claim.sub', coalesce(who::text, ''), false);
$$;

grant execute on all functions in schema tests to public;

\set alice '''00000000-0000-4000-8000-00000000000a'''
\set bob '''00000000-0000-4000-8000-00000000000b'''

insert into auth.users (id) values (:alice), (:bob);

-- Profiles are created on sign-up with a valid default name.
select tests.check((select count(*) = 2 from public.profiles), 'a profile per user');
select tests.check((select bool_and(display_name ~ '^Pilot-[0-9A-F]{4}$') from public.profiles), 'default pilot names');

-- Saves: players see and write only their own row.
set role authenticated;
select tests.login(:alice);
insert into public.saves (user_id, data, saved_at) values (:alice, '{"wallet": 120, "xp": 900, "games": 12}', 100);
select tests.login(:bob);
insert into public.saves (user_id, data, saved_at) values (:bob, '{"wallet": 5, "xp": 50, "games": 2}', 100);
select tests.check((select count(*) = 1 from public.saves), 'bob only sees his own save');
do $$
begin
  insert into public.saves (user_id, data, saved_at) values ('00000000-0000-4000-8000-00000000000a', '{}', 1);
  raise exception 'FAILED: bob wrote alice''s save';
exception when insufficient_privilege or unique_violation then null;
end;
$$;
update public.saves set data = '{"wallet": 999999}' where user_id = :alice;
reset role;
select tests.check((select (data ->> 'wallet')::int = 120 from public.saves where user_id = :alice), 'bob cannot update alice''s save');

-- Runs: plausibility constraints reject impossible results.
set role authenticated;
select tests.login(:alice);
insert into public.runs (id, user_id, mode, value, score, coins, perfects, best_combo, planets, duration_ms)
values ('10000000-0000-4000-8000-000000000001', :alice, 'normal', 30, 30, 8, 4, 2, 20, 40000);
do $$
begin
  insert into public.runs (id, user_id, mode, value, score, coins, perfects, best_combo, planets, duration_ms)
  values (gen_random_uuid(), '00000000-0000-4000-8000-00000000000a', 'normal', 500, 500, 0, 0, 0, 500, 1000);
  raise exception 'FAILED: accepted 500 planets in one second';
exception when check_violation then null;
end;
$$;
do $$
begin
  insert into public.runs (id, user_id, mode, value, score, coins, perfects, best_combo, planets, duration_ms)
  values (gen_random_uuid(), '00000000-0000-4000-8000-00000000000a', 'daily', 5, 5, 0, 0, 0, 3, 9000);
  raise exception 'FAILED: daily run without a challenge';
exception when check_violation then null;
end;
$$;
insert into public.runs (id, user_id, mode, challenge_type, challenge_day, value, score, coins, perfects, best_combo, planets, duration_ms)
values ('10000000-0000-4000-8000-000000000002', :alice, 'daily', 'coins', '2026-6-8', 12, 40, 12, 3, 3, 25, 50000);

select tests.login(:bob);
insert into public.runs (id, user_id, mode, value, score, coins, perfects, best_combo, planets, duration_ms)
values ('20000000-0000-4000-8000-000000000001', :bob, 'normal', 50, 50, 10, 6, 3, 30, 60000);
do $$
begin
  insert into public.runs (id, user_id, mode, value, score, coins, perfects, best_combo, planets, duration_ms)
  values (gen_random_uuid(), '00000000-0000-4000-8000-00000000000a', 'normal', 99, 99, 0, 0, 0, 10, 60000);
  raise exception 'FAILED: bob logged a run for alice';
exception when insufficient_privilege then null;
end;
$$;

-- Leaderboards rank players and flag the caller.
select tests.check((select array_agg(rank::int || ':' || value || ':' || is_me order by rank) = array['1:50:true', '2:30:false'] from public.leaderboard('all')), 'all-time board for bob');
select tests.login(:alice);
select tests.check((select array_agg(value || ':' || is_me order by rank) = array['50:false', '30:true'] from public.leaderboard('week')), 'weekly board for alice');
select tests.check((select array_agg(value) = array[12] from public.leaderboard('daily', '2026-6-8', 'coins')), 'daily board uses the challenge value');
select tests.check((select count(*) = 0 from public.leaderboard('daily', '2026-6-8', 'classic')), 'other challenges stay empty');
select tests.check((select array_agg(value order by rank) = array[900, 50] from public.leaderboard('level')), 'level board ranks by xp');
select tests.check((select array_agg(value order by rank) = array[12, 2] from public.leaderboard('games')), 'games board ranks by games played');
select tests.check((select count(*) = 0 from public.leaderboard('bogus')), 'unknown boards are empty');
reset role;

set role anon;
do $$
begin
  perform public.leaderboard('all');
  raise exception 'FAILED: anonymous visitors can read leaderboards';
exception when insufficient_privilege then null;
end;
$$;
reset role;

-- Ledger: prices are checked against the server catalog.
set role authenticated;
select tests.login(:alice);
insert into public.ledger (id, user_id, kind, source, amount, wallet_after, detail) values
  ('30000000-0000-4000-8000-000000000001', :alice, 'earn', 'opening', 100, 100, '{}'),
  ('30000000-0000-4000-8000-000000000002', :alice, 'spend', 'cosmetic', 40, 60, '{"items": [{"kind": "skin", "id": "ember"}]}'),
  ('30000000-0000-4000-8000-000000000003', :alice, 'spend', 'cosmetic', 1, 59, '{"items": [{"kind": "skin", "id": "obsidian"}]}'),
  ('30000000-0000-4000-8000-000000000004', :alice, 'spend', 'bundle', 160, 0, '{"bundle": "starter", "items": [{"kind": "skin", "id": "ember"}, {"kind": "trail", "id": "pixel"}, {"kind": "theme", "id": "candy"}]}'),
  ('30000000-0000-4000-8000-000000000005', :alice, 'spend', 'deal', 60, 0, '{"items": [{"kind": "trail", "id": "pixel"}]}'),
  ('30000000-0000-4000-8000-000000000006', :alice, 'spend', 'box', 250, 0, '{"items": [{"kind": "theme", "id": "lava"}]}'),
  ('30000000-0000-4000-8000-000000000007', :alice, 'spend', 'upgrade', 300, 0, '{"id": "sturdy", "level": 2}'),
  ('30000000-0000-4000-8000-000000000008', :alice, 'spend', 'boost', 150, 0, '{"id": "coins2x"}'),
  ('30000000-0000-4000-8000-000000000009', :alice, 'earn', 'run', 8, 8, '{"run_id": "10000000-0000-4000-8000-000000000001"}'),
  ('30000000-0000-4000-8000-00000000000a', :alice, 'earn', 'run', 8, 8, '{"run_id": "not-a-uuid"}'),
  ('30000000-0000-4000-8000-00000000000b', :alice, 'earn', 'daily_reward', 500, 500, '{}'),
  ('30000000-0000-4000-8000-00000000000c', :alice, 'earn', 'dev', 100, 100, '{}'),
  ('30000000-0000-4000-8000-00000000000d', :alice, 'spend', 'cosmetic', 40, 60, '{"items": [{"kind": "skin", "id": "nope"}]}');
do $$
begin
  insert into public.ledger (id, user_id, kind, source, amount, wallet_after) values (gen_random_uuid(), '00000000-0000-4000-8000-00000000000a', 'earn', 'opening', 1, 1);
  raise exception 'FAILED: a second opening balance';
exception when unique_violation then null;
end;
$$;
do $$
begin
  insert into public.ledger (id, user_id, kind, source, amount, wallet_after) values (gen_random_uuid(), '00000000-0000-4000-8000-00000000000a', 'earn', 'cosmetic', 1, 1);
  raise exception 'FAILED: earning from a purchase source';
exception when check_violation then null;
end;
$$;
reset role;

select tests.check(
  (select array_agg(right(id::text, 1) order by id) = array['1', '2', '4', '5', '6', '7', '8', '9'] from public.ledger where not suspicious),
  'valid entries pass the price checks'
);
select tests.check(
  (select array_agg(right(id::text, 1) order by id) = array['3', 'a', 'b', 'c', 'd'] from public.ledger where suspicious),
  'wrong prices, unknown runs, oversized rewards, dev grants and unknown items are flagged'
);
select tests.check((select note like 'price mismatch%' from public.ledger where id = '30000000-0000-4000-8000-000000000003'), 'flagged entries explain why');

-- Balances ignore suspicious entries; the audit is admin-only.
set role authenticated;
select tests.login(:alice);
select tests.check((select balance = 100 - 40 - 160 - 60 - 250 - 300 - 150 + 8 from public.wallet_balances), 'balance counts only verified entries');
select tests.check((select count(*) = 1 from public.wallet_balances), 'players only see their own balance');
do $$
begin
  perform public.economy_audit();
  raise exception 'FAILED: players can run the economy audit';
exception when insufficient_privilege then null;
end;
$$;
reset role;

set role service_role;
select tests.check((select count(*) >= 1 from public.economy_audit() where user_id = :alice and suspicious_entries = 5), 'audit lists alice''s flagged entries');
reset role;

-- Catalog is readable by everyone and not writable by players.
set role anon;
select tests.check((select count(*) > 0 from public.catalog_items), 'catalog is public');
reset role;
set role authenticated;
do $$
begin
  update public.catalog_items set price = 0;
  if exists (select 1 from public.catalog_items where price = 0 and id <> 'classic') then
    raise exception 'FAILED: players changed catalog prices';
  end if;
end;
$$;
reset role;

-- Profiles: players rename only themselves, with a valid name.
set role authenticated;
select tests.login(:bob);
update public.profiles set display_name = 'Bob The Pilot' where user_id = :bob;
update public.profiles set display_name = 'Hacked' where user_id = :alice;
do $$
begin
  update public.profiles set display_name = '<script>' where user_id = '00000000-0000-4000-8000-00000000000b';
  raise exception 'FAILED: invalid display name accepted';
exception when check_violation then null;
end;
$$;
reset role;
select tests.check((select display_name = 'Bob The Pilot' from public.profiles where user_id = :bob), 'bob renamed himself');
select tests.check((select display_name <> 'Hacked' from public.profiles where user_id = :alice), 'bob cannot rename alice');
