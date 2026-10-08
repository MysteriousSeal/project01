-- Save versioning, precomputed boards and generated save columns. Run with scripts/test-db.sh.
\set carol '''00000000-0000-4000-8000-0000000000c1'''
\set dave '''00000000-0000-4000-8000-0000000000d1'''

insert into auth.users (id) values (:carol), (:dave);

-- An older save never overwrites a newer one.
set role authenticated;
select tests.login(:carol);
insert into public.saves (user_id, data, saved_at) values (:carol, '{"wallet": 10, "xp": 300, "games": 4}', 5000);
insert into public.saves (user_id, data, saved_at) values (:carol, '{"wallet": 1}', 4000)
  on conflict (user_id) do update set data = excluded.data, saved_at = excluded.saved_at;
reset role;
select tests.check((select wallet = 10 and saved_at = 5000 from public.saves where user_id = :carol), 'stale save is ignored');

set role authenticated;
select tests.login(:carol);
insert into public.saves (user_id, data, saved_at) values (:carol, '{"wallet": 25, "xp": 450, "games": 5}', 6000)
  on conflict (user_id) do update set data = excluded.data, saved_at = excluded.saved_at;
reset role;
select tests.check((select wallet = 25 and xp = 450 and games = 5 from public.saves where user_id = :carol), 'newer save wins and generated columns follow');

set role authenticated;
select tests.login(:dave);
insert into public.saves (user_id, data, saved_at) values (:dave, '{"wallet": "lots", "xp": -50, "games": 3.9}', 99999999999999);
reset role;
select tests.check(
  (select saved_at <= (extract(epoch from now()) * 1000)::bigint + 86400000 from public.saves where user_id = :dave),
  'clocks set in the future are capped to one day ahead'
);
select tests.check((select wallet = 0 and xp = 0 and games = 3 from public.saves where user_id = :dave), 'generated columns sanitize odd values');

-- Best scores keep each player's maximum per board.
set role authenticated;
select tests.login(:carol);
insert into public.runs (id, user_id, mode, value, score, coins, perfects, best_combo, planets, duration_ms) values
  (gen_random_uuid(), :carol, 'normal', 70, 70, 5, 3, 2, 40, 90000),
  (gen_random_uuid(), :carol, 'normal', 20, 20, 1, 1, 1, 10, 30000);
insert into public.runs (id, user_id, mode, challenge_type, challenge_day, value, score, coins, perfects, best_combo, planets, duration_ms) values
  (gen_random_uuid(), :carol, 'daily', 'classic', '2026-6-9', 33, 33, 2, 2, 2, 20, 40000),
  (gen_random_uuid(), :carol, 'daily', 'classic', '2026-6-9', 44, 44, 2, 2, 2, 25, 40000);
reset role;

select tests.check((select value = 70 from public.best_scores where board = 'all' and user_id = :carol), 'all-time best keeps the max');
select tests.check((select value = 70 from public.best_scores where board = public.week_board(now()) and user_id = :carol), 'weekly best is keyed by week');
select tests.check((select value = 44 from public.best_scores where board = 'daily:2026-6-9:classic' and user_id = :carol), 'daily best keeps the max');
select tests.check((select count(*) = 0 from public.best_scores where board like 'daily:2026-6-9:classic' and user_id = :dave), 'no rows for players without runs');

-- Backfilled and live rows agree with the boards.
set role authenticated;
select tests.login(:carol);
select tests.check((select array_agg(value order by rank) = array[70, 50, 30] from public.leaderboard('all')), 'all-time board reads best scores');
select tests.check((select value = 44 and is_me from public.leaderboard('daily', '2026-6-9', 'classic')), 'daily board reads best scores');
select tests.check((select count(*) = 0 from public.leaderboard('daily', '2026-6-9', 'coins')), 'a challenge board never shows another challenge');
select tests.check((select count(*) = 0 from public.leaderboard('daily', '2026-6-10', 'classic')), 'a daily board never shows another day');
select tests.check((select array_agg(value order by rank) = array[70, 50, 30] from public.leaderboard('week')), 'weekly board only counts this week''s runs');
select tests.check((select array_agg(value order by rank) = array[900, 450, 50] from public.leaderboard('level')), 'level board reads generated xp');
reset role;

-- Weekly boards split by week, independent of the session time zone.
select tests.check(public.week_board('2026-06-14 23:30:00+00') = 'week:2026-06-08', 'sunday night belongs to the week starting monday');
select tests.check(public.week_board('2026-06-15 00:00:00+00') = 'week:2026-06-15', 'monday starts a new week');
set time zone 'America/Los_Angeles';
select tests.check(public.week_board('2026-06-15 00:30:00+00') = 'week:2026-06-15', 'weeks use UTC whatever the session zone');
reset time zone;

-- Players cannot read or edit best scores directly.
set role authenticated;
select tests.login(:carol);
select tests.check((select count(*) = 0 from public.best_scores), 'best scores are hidden behind the leaderboard function');
reset role;

-- Trophy rewards are checked against the catalog and paid once per tier.
set role authenticated;
select tests.login(:carol);
insert into public.ledger (id, user_id, kind, source, amount, wallet_after, detail) values
  ('40000000-0000-4000-8000-000000000001', :carol, 'earn', 'trophy', 100, 100, '{"trophies": [{"id": "explorer", "tier": 1}, {"id": "explorer", "tier": 2}]}'),
  ('40000000-0000-4000-8000-000000000002', :carol, 'earn', 'trophy', 25, 125, '{"trophies": [{"id": "explorer", "tier": 1}]}'),
  ('40000000-0000-4000-8000-000000000003', :carol, 'earn', 'trophy', 999, 999, '{"trophies": [{"id": "regular", "tier": 1}]}'),
  ('40000000-0000-4000-8000-000000000004', :carol, 'earn', 'trophy', 25, 25, '{"trophies": [{"id": "regular", "tier": 4}]}'),
  ('40000000-0000-4000-8000-000000000005', :carol, 'earn', 'trophy', 50, 50, '{"trophies": [{"id": "hopper", "tier": 1}, {"id": "hopper", "tier": 1}]}'),
  ('40000000-0000-4000-8000-000000000006', :carol, 'earn', 'trophy', 25, 25, '{}'),
  ('40000000-0000-4000-8000-000000000007', :carol, 'earn', 'trophy', 200, 200, '{"trophies": [{"id": "comboKing", "tier": 3}]}');
reset role;
select tests.check(
  (select array_agg(right(id::text, 1) order by id) = array['1', '7'] from public.ledger where source = 'trophy' and not suspicious),
  'valid trophy rewards pass; repeats, wrong amounts, unknown tiers, duplicates and missing lists are flagged'
);
select tests.check((select note = 'trophy tier already rewarded' from public.ledger where id = '40000000-0000-4000-8000-000000000002'), 'repeat tiers explain why');
select tests.check((select value = 200 from public.catalog_settings where key = 'trophy_tier_3'), 'trophy rewards are in the catalog');

-- Platinum and Diamond tiers are paid from the catalog too.
set role authenticated;
select tests.login(:dave);
insert into public.ledger (id, user_id, kind, source, amount, wallet_after, detail) values
  ('50000000-0000-4000-8000-000000000001', :dave, 'earn', 'trophy', 1150, 1150, '{"trophies": [{"id": "regular", "tier": 4}, {"id": "regular", "tier": 5}]}'),
  ('50000000-0000-4000-8000-000000000002', :dave, 'earn', 'trophy', 900, 900, '{"trophies": [{"id": "hopper", "tier": 6}]}');
reset role;
select tests.check((select not suspicious from public.ledger where id = '50000000-0000-4000-8000-000000000001'), 'platinum and diamond rewards pass');
select tests.check((select suspicious from public.ledger where id = '50000000-0000-4000-8000-000000000002'), 'tiers beyond diamond are flagged');

-- Revives are spends priced by the catalog, once per revive of a run.
set role authenticated;
select tests.login(:dave);
insert into public.ledger (id, user_id, kind, source, amount, wallet_after, detail) values
  ('60000000-0000-4000-8000-000000000001', :dave, 'spend', 'revive', 50, 1100, '{"run_id": "70000000-0000-4000-8000-000000000001", "count": 1}'),
  ('60000000-0000-4000-8000-000000000002', :dave, 'spend', 'revive', 150, 950, '{"run_id": "70000000-0000-4000-8000-000000000001", "count": 2}'),
  ('60000000-0000-4000-8000-000000000003', :dave, 'spend', 'revive', 50, 900, '{"run_id": "70000000-0000-4000-8000-000000000001", "count": 1}'),
  ('60000000-0000-4000-8000-000000000004', :dave, 'spend', 'revive', 10, 890, '{"run_id": "70000000-0000-4000-8000-000000000002", "count": 1}'),
  ('60000000-0000-4000-8000-000000000005', :dave, 'spend', 'revive', 300, 590, '{"run_id": "70000000-0000-4000-8000-000000000002", "count": 3}'),
  ('60000000-0000-4000-8000-000000000006', :dave, 'spend', 'revive', 50, 540, '{"count": 1}');
do $$
begin
  insert into public.ledger (id, user_id, kind, source, amount, wallet_after) values (gen_random_uuid(), '00000000-0000-4000-8000-0000000000d1', 'earn', 'revive', 50, 50);
  raise exception 'FAILED: a revive recorded as earnings';
exception when check_violation then null;
end;
$$;
reset role;
select tests.check(
  (select array_agg(right(id::text, 1) order by id) = array['1', '2'] from public.ledger where source = 'revive' and not suspicious),
  'valid revives pass; repeats, wrong prices, extra revives and missing runs are flagged'
);
select tests.check((select note = 'revive already paid' from public.ledger where id = '60000000-0000-4000-8000-000000000003'), 'repeat revives explain why');
