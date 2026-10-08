-- 1. Never let an older save overwrite a newer one (offline phones, multiple devices), and cap clocks set in the future.
create function public.guard_save_version() returns trigger
  language plpgsql
  set search_path = ''
as $$
begin
  new.saved_at := least(new.saved_at, (extract(epoch from now()) * 1000)::bigint + 86400000);
  if tg_op = 'UPDATE' and new.saved_at < old.saved_at then
    return null;
  end if;
  return new;
end;
$$;

create trigger saves_guard_version
  before insert or update on public.saves
  for each row execute function public.guard_save_version();

-- 2. Indexed copies of the save numbers used by boards and the audit.
alter table public.saves
  add column xp bigint generated always as (
    case when jsonb_typeof(data -> 'xp') = 'number' then least(greatest(floor((data ->> 'xp')::numeric), 0), 2000000000)::bigint else 0 end
  ) stored,
  add column games bigint generated always as (
    case when jsonb_typeof(data -> 'games') = 'number' then least(greatest(floor((data ->> 'games')::numeric), 0), 2000000000)::bigint else 0 end
  ) stored,
  add column wallet bigint generated always as (
    case when jsonb_typeof(data -> 'wallet') = 'number' then least(greatest(floor((data ->> 'wallet')::numeric), 0), 2000000000)::bigint else 0 end
  ) stored;

create index saves_xp on public.saves (xp desc) where xp > 0;
create index saves_games on public.saves (games desc) where games > 0;

-- 3. Each player's best value per score board, kept up to date as runs arrive.
create table public.best_scores (
  board text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  value integer not null check (value >= 0),
  achieved_at timestamptz not null default now(),
  primary key (board, user_id)
);

create index best_scores_rank on public.best_scores (board, value desc);

alter table public.best_scores enable row level security;

create function public.week_board(at timestamptz) returns text
  language sql
  immutable
  set search_path = ''
as $$
  select 'week:' || to_char(date_trunc('week', at at time zone 'UTC'), 'YYYY-MM-DD')
$$;

create function public.record_best_scores() returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
begin
  insert into public.best_scores as b (board, user_id, value, achieved_at)
  select board, new.user_id, new.value, new.created_at
  from unnest(
    case new.mode
      when 'normal' then array['all', public.week_board(new.created_at)]
      else array['daily:' || new.challenge_day || ':' || new.challenge_type]
    end
  ) as boards (board)
  on conflict (board, user_id) do update
    set value = excluded.value, achieved_at = excluded.achieved_at
    where excluded.value > b.value;
  return null;
end;
$$;

create trigger runs_record_best_scores
  after insert on public.runs
  for each row execute function public.record_best_scores();

insert into public.best_scores (board, user_id, value, achieved_at)
select board, user_id, max(value), min(created_at)
from (
  select 'all' as board, r.user_id, r.value, r.created_at from public.runs r where r.mode = 'normal'
  union all
  select public.week_board(r.created_at), r.user_id, r.value, r.created_at from public.runs r where r.mode = 'normal'
  union all
  select 'daily:' || r.challenge_day || ':' || r.challenge_type, r.user_id, r.value, r.created_at from public.runs r where r.mode = 'daily'
) all_runs
group by board, user_id
on conflict (board, user_id) do nothing;

-- The old per-call scans are gone, so these indexes only slowed down inserts.
drop index if exists public.runs_normal_value;
drop index if exists public.runs_normal_recent;
drop index if exists public.runs_daily_board;

-- 4. Leaderboards read precomputed bests and indexed save columns.
create or replace function public.leaderboard(
  board text,
  board_day text default null,
  board_type text default null,
  max_rows integer default 50
)
returns table (rank bigint, display_name text, value integer, is_me boolean)
language sql
stable
security definer
set search_path = ''
as $$
  with best as (
    select b.user_id, b.value::bigint as value
    from public.best_scores b
    where b.board = case leaderboard.board
      when 'all' then 'all'
      when 'week' then public.week_board(now())
      when 'daily' then 'daily:' || leaderboard.board_day || ':' || leaderboard.board_type
    end
    union all
    select s.user_id, s.xp from public.saves s where leaderboard.board = 'level' and s.xp > 0
    union all
    select s.user_id, s.games from public.saves s where leaderboard.board = 'games' and s.games > 0
  ),
  ranked as (
    select b.user_id, b.value, rank() over (order by b.value desc) as rank
    from best b
    where b.value > 0
  )
  select ranked.rank, coalesce(p.display_name, 'Pilot'), least(ranked.value, 2147483647)::integer, ranked.user_id = (select auth.uid())
  from ranked
  left join public.profiles p on p.user_id = ranked.user_id
  where ranked.rank <= least(greatest(leaderboard.max_rows, 1), 100) or ranked.user_id = (select auth.uid())
  order by ranked.rank, 2
$$;

revoke execute on function public.leaderboard(text, text, text, integer) from public, anon;
grant execute on function public.leaderboard(text, text, text, integer) to authenticated;

-- 5. Audit reads the indexed wallet and is explicitly reserved for the service role.
create or replace function public.economy_audit(min_gap integer default 1)
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
  select s.user_id, p.display_name, s.wallet, coalesce(b.balance, 0), s.wallet - coalesce(b.balance, 0), coalesce(b.suspicious_entries, 0)
  from public.saves s
  left join balances b on b.user_id = s.user_id
  left join public.profiles p on p.user_id = s.user_id
  where s.wallet - coalesce(b.balance, 0) >= min_gap or coalesce(b.suspicious_entries, 0) > 0
  order by s.wallet - coalesce(b.balance, 0) desc
$$;

revoke execute on function public.economy_audit(integer) from public, anon, authenticated;
grant execute on function public.economy_audit(integer) to service_role;

revoke execute on function public.week_board(timestamptz) from public, anon, authenticated;
