-- One cloud save per player. Players are Supabase Auth users (anonymous at first).
create table public.saves (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  saved_at bigint not null,
  updated_at timestamptz not null default now(),
  constraint saves_data_is_object check (jsonb_typeof(data) = 'object'),
  constraint saves_data_size check (octet_length(data::text) <= 262144)
);

alter table public.saves enable row level security;

create policy "Players can read their own save"
  on public.saves for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Players can create their own save"
  on public.saves for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Players can update their own save"
  on public.saves for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create function public.touch_updated_at() returns trigger
  language plpgsql
  set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger saves_touch_updated_at
  before update on public.saves
  for each row execute function public.touch_updated_at();
