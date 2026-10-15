-- migration_012: comandos do responsável pelo WhatsApp (liberar produto, reenviar acesso, trocar email…).
-- Motivo (14/10/2026): ações que só uma pessoa fazia (liberar Protocolo, reenviar acesso, cardápio extra)
-- travavam as consultas. O Bruno pede em português pelo WhatsApp dele; o sistema mostra o que vai fazer,
-- espera "sim" e executa. Cada pedido fica registrado aqui. Só service role: RLS ligada, sem policy.

create table if not exists public.whatsapp_comandos (
  id bigint generated always as identity primary key,
  pedido text not null,                   -- o que ele escreveu
  acao text not null,
  params jsonb not null default '{}',
  resumo text not null,                   -- "Vou liberar X para Y" (o que ele confirmou)
  status text not null default 'aguardando' check (status in ('aguardando', 'executado', 'cancelado', 'erro')),
  resultado text,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create index if not exists whatsapp_comandos_aguardando on public.whatsapp_comandos (created_at) where status = 'aguardando';
alter table public.whatsapp_comandos enable row level security;
