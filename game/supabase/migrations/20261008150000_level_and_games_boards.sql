-- Adds 'level' (ranked by total XP) and 'games' (games played) boards, read from each player's cloud save.
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
    select r.user_id, max(r.value)::bigint as value
    from public.runs r
    where case board
      when 'all' then r.mode = 'normal'
      when 'week' then r.mode = 'normal' and r.created_at >= date_trunc('week', now())
      when 'daily' then r.mode = 'daily' and r.challenge_day = board_day and r.challenge_type = board_type
      else false
    end
    group by r.user_id
    union all
    select s.user_id, least(coalesce((s.data ->> 'xp')::numeric, 0), 2000000000)::bigint
    from public.saves s
    where board = 'level' and jsonb_typeof(s.data -> 'xp') = 'number'
    union all
    select s.user_id, least(coalesce((s.data ->> 'games')::numeric, 0), 2000000000)::bigint
    from public.saves s
    where board = 'games' and jsonb_typeof(s.data -> 'games') = 'number'
  ),
  ranked as (
    select b.user_id, b.value, rank() over (order by b.value desc) as rank
    from best b
    where b.value > 0
  )
  select ranked.rank, coalesce(p.display_name, 'Pilot'), ranked.value::integer, ranked.user_id = (select auth.uid())
  from ranked
  left join public.profiles p on p.user_id = ranked.user_id
  where ranked.rank <= least(greatest(max_rows, 1), 100) or ranked.user_id = (select auth.uid())
  order by ranked.rank, 2
$$;

revoke execute on function public.leaderboard(text, text, text, integer) from public, anon;
grant execute on function public.leaderboard(text, text, text, integer) to authenticated;
