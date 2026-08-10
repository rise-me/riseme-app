-- migration_007: cardápios personalizados (feature "Mi menú").
-- Uma linha por cardápio gerado. A COTA é contada em cima desta tabela
-- (vitalícia: 2 no total · assinatura mensal: 3/mês · anual: 1/semana),
-- então NÃO apagar linhas — são o registro do que já foi consumido.

create table if not exists public.diet_menus (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  locale text not null default 'es',
  menu jsonb not null
);

create index if not exists diet_menus_user_created
  on public.diet_menus (user_id, created_at desc);

alter table public.diet_menus enable row level security;

-- Aluna lê só os próprios cardápios. INSERT não tem policy de propósito:
-- só o servidor (service role) grava, depois de checar a cota.
drop policy if exists diet_menus_select_own on public.diet_menus;
create policy diet_menus_select_own
  on public.diet_menus for select
  using (auth.uid() = user_id);
