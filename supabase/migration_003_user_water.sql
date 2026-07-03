-- Migration 003: tracker de água real (card da home)
-- Uma linha por usuária por dia (data local do aparelho, enviada pelo client).

create table if not exists public.user_water (
  user_id uuid references public.users(id) on delete cascade not null,
  date date not null,
  ml integer not null default 0 check (ml >= 0 and ml <= 20000),
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

alter table public.user_water enable row level security;

create policy "user_water_select_own" on public.user_water
  for select using (auth.uid() = user_id);
create policy "user_water_insert_own" on public.user_water
  for insert with check (auth.uid() = user_id);
create policy "user_water_update_own" on public.user_water
  for update using (auth.uid() = user_id);
