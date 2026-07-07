create extension if not exists "pgcrypto";

create table if not exists public.points (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('functional_open', 'functional_new', 'general_wishes', 'market_interest')),
  title text not null check (char_length(title) between 1 and 200),
  description text,
  interested_customers text,
  created_at timestamptz not null default now()
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  point_id uuid not null references public.points(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now()
);

alter table public.points enable row level security;
alter table public.comments enable row level security;

create policy "points_select_own" on public.points
  for select using (auth.uid() = user_id);
create policy "points_insert_own" on public.points
  for insert with check (auth.uid() = user_id);
create policy "points_update_own" on public.points
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "points_delete_own" on public.points
  for delete using (auth.uid() = user_id);

create policy "comments_select_own" on public.comments
  for select using (auth.uid() = user_id);
create policy "comments_insert_own" on public.comments
  for insert with check (auth.uid() = user_id);
create policy "comments_update_own" on public.comments
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "comments_delete_own" on public.comments
  for delete using (auth.uid() = user_id);

create or replace function public.set_user_id_for_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.user_id := auth.uid();
  return new;
end;
$$;

create or replace function public.set_user_id_for_comments()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.user_id := auth.uid();
  return new;
end;
$$;

drop trigger if exists trg_set_user_id_for_points on public.points;
create trigger trg_set_user_id_for_points
before insert on public.points
for each row execute procedure public.set_user_id_for_points();

drop trigger if exists trg_set_user_id_for_comments on public.comments;
create trigger trg_set_user_id_for_comments
before insert on public.comments
for each row execute procedure public.set_user_id_for_comments();
