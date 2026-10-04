-- migration_008: conversas de WhatsApp (Z-API + agente Claude).
-- whatsapp_chats = 1 linha por número: quem está respondendo agora (bot/humano).
-- whatsapp_messages = histórico de tudo que entrou e saiu — é o que o agente lê
-- como contexto e o que a gente usa pra calibrar as respostas.
-- Só o servidor (service role) lê e grava: RLS ligada e SEM policy de propósito.

create table if not exists public.whatsapp_chats (
  phone text primary key,                 -- só dígitos com DDI, formato da Z-API
  user_id uuid references auth.users (id) on delete set null,
  mode text not null default 'bot' check (mode in ('bot', 'human')),
  human_until timestamptz,                -- fim da pausa do bot (passou → volta pro bot)
  handoff_reason text,
  updated_at timestamptz not null default now()
);

create table if not exists public.whatsapp_messages (
  id bigint generated always as identity primary key,
  phone text not null,
  direction text not null check (direction in ('in', 'out')),
  author text not null check (author in ('student', 'agent', 'human', 'system')),
  body text not null,
  wa_message_id text unique,              -- idempotência: a Z-API pode reenviar o webhook
  created_at timestamptz not null default now()
);

create index if not exists whatsapp_messages_phone_created
  on public.whatsapp_messages (phone, created_at desc);

alter table public.whatsapp_chats enable row level security;
alter table public.whatsapp_messages enable row level security;
