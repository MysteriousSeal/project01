-- Limits read from the generated catalog, and a single check on the ledger. Run with scripts/test-db.sh.
\set erin '''00000000-0000-4000-8000-0000000000e1'''
insert into auth.users (id) values (:erin);

select tests.check(
  (select count(*) = 1 from pg_trigger where tgrelid = 'public.ledger'::regclass and not tgisinternal),
  'the ledger has exactly one check'
);
select tests.check(not exists (select 1 from pg_proc where proname in ('check_trophy_entry', 'check_revive_entry')), 'old checks are gone');

set role authenticated;
select tests.login(:erin);
insert into public.runs (id, user_id, mode, value, score, coins, perfects, best_combo, planets, duration_ms)
values ('80000000-0000-4000-8000-000000000001', :erin, 'normal', 40, 40, 12, 3, 2, 30, 60000);
insert into public.ledger (id, user_id, kind, source, amount, wallet_after, detail) values
  ('90000000-0000-4000-8000-000000000001', :erin, 'earn', 'daily_reward', 85, 85, '{}'),
  ('90000000-0000-4000-8000-000000000002', :erin, 'earn', 'daily_reward', 86, 171, '{}'),
  ('90000000-0000-4000-8000-000000000003', :erin, 'earn', 'run', 10012, 10183, '{"run_id": "80000000-0000-4000-8000-000000000001"}'),
  ('90000000-0000-4000-8000-000000000004', :erin, 'earn', 'run', 10013, 20196, '{"run_id": "80000000-0000-4000-8000-000000000001"}'),
  ('90000000-0000-4000-8000-000000000005', :erin, 'spend', 'upgrade', 120, 0, '{"id": "magnet"}');
reset role;

select tests.check((select not suspicious from public.ledger where id = '90000000-0000-4000-8000-000000000001'), 'the largest daily reward passes');
select tests.check((select suspicious from public.ledger where id = '90000000-0000-4000-8000-000000000002'), 'a bigger daily reward is flagged');
select tests.check((select not suspicious from public.ledger where id = '90000000-0000-4000-8000-000000000003'), 'run coins plus the largest bonus pass');
select tests.check((select note = 'earned more than the run allows' from public.ledger where id = '90000000-0000-4000-8000-000000000004'), 'anything above is flagged');
select tests.check((select note like 'price mismatch%' from public.ledger where id = '90000000-0000-4000-8000-000000000005'), 'an upgrade without a level is flagged');

set role authenticated;
do $$
begin
  perform public.catalog_value('box_price');
  raise exception 'FAILED: players can call the catalog helper';
exception when insufficient_privilege then null;
end;
$$;
reset role;
