-- migration_011: consultas ao responsável + aprendizados do agente de WhatsApp.
-- Motivo (10/10/2026): o agente transferia e ninguém respondia — a aluna ficava dias esperando e o
-- Bruno não via o que estava sendo respondido. Agora cada transferência vira uma CONSULTA no WhatsApp
-- do Bruno (dúvida + 2 respostas possíveis); ele responde A/B/texto, o agente envia à aluna, e a
-- resposta que vale para outras alunas fica em whatsapp_aprendizados (o agente passa a responder sozinho).
-- Só service role: RLS ligada, sem policy.

create table if not exists public.whatsapp_consultas (
  id bigint generated always as identity primary key,
  phone text not null,                    -- chat da aluna (chave de whatsapp_chats)
  nome text,
  motivo text,
  resumo text not null,
  opcao_a text,
  opcao_b text,
  alert_message_id text,                  -- mensagem enviada ao responsável (ele responde citando)
  status text not null default 'pendente' check (status in ('pendente', 'respondida', 'pulada')),
  orientacao text,                        -- o que o responsável mandou responder
  resposta_enviada text,                  -- o que foi para a aluna
  created_at timestamptz not null default now(),
  answered_at timestamptz
);
create index if not exists whatsapp_consultas_pendentes on public.whatsapp_consultas (created_at) where status = 'pendente';
create index if not exists whatsapp_consultas_alerta on public.whatsapp_consultas (alert_message_id);

create table if not exists public.whatsapp_aprendizados (
  id bigint generated always as identity primary key,
  pergunta text not null,
  resposta text not null,
  consulta_id bigint references public.whatsapp_consultas (id) on delete set null,
  ativo boolean not null default true,    -- desligar uma regra errada sem apagar o histórico
  created_at timestamptz not null default now()
);

alter table public.whatsapp_consultas enable row level security;
alter table public.whatsapp_aprendizados enable row level security;
