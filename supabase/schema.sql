-- RiseMe Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ENUMS
create type access_type as enum ('lifetime', 'subscription', 'purchased');
create type subscription_status as enum ('active', 'canceled', 'past_due', 'trialing');
create type plan_type as enum ('monthly', 'annual');

-- USERS (extends Supabase auth.users)
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  name text,
  avatar_url text,
  hotmart_buyer_id text unique,
  created_at timestamptz default now() not null
);

-- CHALLENGES
create table public.challenges (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  thumbnail_url text,
  category text not null,
  is_free boolean default false not null,
  days_count integer default 28 not null,
  "order" integer default 0 not null,
  created_at timestamptz default now() not null
);

-- CHALLENGE DAYS
create table public.challenge_days (
  id uuid default uuid_generate_v4() primary key,
  challenge_id uuid references public.challenges(id) on delete cascade not null,
  day_number integer not null,
  title text not null,
  video_url text,
  duration_seconds integer,
  unique(challenge_id, day_number)
);

-- USER CHALLENGES (access control)
create table public.user_challenges (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  challenge_id uuid references public.challenges(id) on delete cascade not null,
  access_type access_type not null,
  granted_at timestamptz default now() not null,
  unique(user_id, challenge_id)
);

-- USER PROGRESS
create table public.user_progress (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  challenge_id uuid references public.challenges(id) on delete cascade not null,
  day_number integer not null,
  completed_at timestamptz default now() not null,
  watched_pct numeric(5,2) default 0 not null,
  unique(user_id, challenge_id, day_number)
);

-- SUBSCRIPTIONS
create table public.subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  stripe_sub_id text unique not null,
  status subscription_status not null,
  plan_type plan_type not null,
  current_period_end timestamptz not null,
  created_at timestamptz default now() not null
);

-- PURCHASES (one-time)
create table public.purchases (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  product_id text not null,
  stripe_payment_id text unique not null,
  amount integer not null, -- in cents
  created_at timestamptz default now() not null
);

-- PUSH SUBSCRIPTIONS
create table public.push_subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  endpoint text unique not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now() not null
);

-- =====================
-- ROW LEVEL SECURITY
-- =====================

alter table public.users enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_days enable row level security;
alter table public.user_challenges enable row level security;
alter table public.user_progress enable row level security;
alter table public.subscriptions enable row level security;
alter table public.purchases enable row level security;
alter table public.push_subscriptions enable row level security;

-- Users: each user sees only their own row
create policy "users_select_own" on public.users for select using (auth.uid() = id);
create policy "users_insert_own" on public.users for insert with check (auth.uid() = id);
create policy "users_update_own" on public.users for update using (auth.uid() = id);

-- Challenges: everyone can read (locked state computed client-side)
create policy "challenges_select_all" on public.challenges for select using (true);

-- Challenge days: everyone can read
create policy "challenge_days_select_all" on public.challenge_days for select using (true);

-- User challenges: own rows only
create policy "user_challenges_select_own" on public.user_challenges for select using (auth.uid() = user_id);
create policy "user_challenges_insert_own" on public.user_challenges for insert with check (auth.uid() = user_id);

-- User progress: own rows only
create policy "user_progress_select_own" on public.user_progress for select using (auth.uid() = user_id);
create policy "user_progress_upsert_own" on public.user_progress for insert with check (auth.uid() = user_id);
create policy "user_progress_update_own" on public.user_progress for update using (auth.uid() = user_id);

-- Subscriptions: own rows only
create policy "subscriptions_select_own" on public.subscriptions for select using (auth.uid() = user_id);

-- Purchases: own rows only
create policy "purchases_select_own" on public.purchases for select using (auth.uid() = user_id);

-- Push subscriptions: own rows only
create policy "push_subscriptions_select_own" on public.push_subscriptions for select using (auth.uid() = user_id);
create policy "push_subscriptions_insert_own" on public.push_subscriptions for insert with check (auth.uid() = user_id);
create policy "push_subscriptions_delete_own" on public.push_subscriptions for delete using (auth.uid() = user_id);

-- =====================
-- AUTO-CREATE USER PROFILE ON SIGNUP
-- =====================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =====================
-- SEED: 5 mock challenges
-- =====================
insert into public.challenges (title, description, category, is_free, days_count, "order") values
  ('Calistenia em Casa', 'Transforme seu corpo sem sair de casa com exercícios de peso corporal progressivos.', 'calistenia', true, 28, 1),
  ('Pilates na Parede', 'Tonifique o corpo todo usando apenas a parede como apoio. Ideal para iniciantes.', 'pilates', false, 28, 2),
  ('Jejum Intermitente', 'Guia completo para iniciar o jejum 16:8 e perder gordura de forma sustentável.', 'nutricao', false, 28, 3),
  ('Yoga para Iniciantes', 'Desenvolva flexibilidade, força e equilíbrio com sequências guiadas de yoga.', 'yoga', false, 28, 4),
  ('HIIT em 15 minutos', 'Treinos de alta intensidade curtos e eficientes para queimar gordura rapidamente.', 'hiit', false, 28, 5);
