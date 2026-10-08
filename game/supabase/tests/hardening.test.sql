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
