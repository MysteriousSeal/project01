-- Player profiles: a public display name for leaderboards.
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now(),
  constraint profiles_name_format check (display_name ~ '^[A-Za-z0-9 _-]{3,16}$')
);

alter table public.profiles enable row level security;

create policy "Players can read their own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Players can rename themselves"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create function public.create_profile() returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, 'Pilot-' || upper(substr(replace(new.id::text, '-', ''), 1, 4)))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.create_profile();

create policy "Players can create their own profile"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);

insert into public.profiles (user_id, display_name)
select u.id, 'Pilot-' || upper(substr(replace(u.id::text, '-', ''), 1, 4))
from auth.users u
on conflict (user_id) do nothing;

-- Every finished run. Ids come from the client so retries never duplicate a run.
create table public.runs (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  mode text not null,
  challenge_type text,
  challenge_day text,
  value integer not null,
  score integer not null,
  coins integer not null,
  perfects integer not null,
  best_combo integer not null,
  planets integer not null,
  duration_ms integer not null,
  death text,
  created_at timestamptz not null default now(),
  constraint runs_mode check (mode in ('normal', 'daily')),
  constraint runs_daily_fields check ((mode = 'daily') = (challenge_type is not null and challenge_day is not null)),
  constraint runs_ranges check (
    score between 0 and 1000000 and coins between 0 and 100000 and perfects between 0 and 100000
    and best_combo between 0 and 100000 and planets between 0 and 100000 and value between 0 and 1000000
    and duration_ms between 0 and 86400000
  ),
  constraint runs_plausible check (score >= planets and perfects <= planets and planets <= 10 + duration_ms / 200)
);

create index runs_normal_value on public.runs (value desc) where mode = 'normal';
create index runs_normal_recent on public.runs (created_at desc) where mode = 'normal';
create index runs_daily_board on public.runs (challenge_day, challenge_type, value desc) where mode = 'daily';
create index runs_user on public.runs (user_id, created_at desc);

alter table public.runs enable row level security;

create policy "Players can log their own runs"
  on public.runs for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Players can read their own runs"
  on public.runs for select to authenticated
  using ((select auth.uid()) = user_id);

-- App sessions, written once when the app goes to the background.
create table public.sessions (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  platform text not null,
  constraint sessions_order check (ended_at >= started_at),
  constraint sessions_length check (ended_at - started_at <= interval '1 day')
);

create index sessions_user on public.sessions (user_id, started_at desc);

alter table public.sessions enable row level security;

create policy "Players can log their own sessions"
  on public.sessions for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- Leaderboards: each player's best value on a board, without exposing other players' ids.
create function public.leaderboard(
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
    select r.user_id, max(r.value) as value
    from public.runs r
    where case board
      when 'all' then r.mode = 'normal'
      when 'week' then r.mode = 'normal' and r.created_at >= date_trunc('week', now())
      when 'daily' then r.mode = 'daily' and r.challenge_day = board_day and r.challenge_type = board_type
      else false
    end
    group by r.user_id
  ),
  ranked as (
    select b.user_id, b.value, rank() over (order by b.value desc) as rank
    from best b
  )
  select ranked.rank, coalesce(p.display_name, 'Pilot'), ranked.value, ranked.user_id = (select auth.uid())
  from ranked
  left join public.profiles p on p.user_id = ranked.user_id
  where ranked.rank <= least(greatest(max_rows, 1), 100) or ranked.user_id = (select auth.uid())
  order by ranked.rank, 2
$$;

revoke execute on function public.leaderboard(text, text, text, integer) from public, anon;
grant execute on function public.leaderboard(text, text, text, integer) to authenticated;
