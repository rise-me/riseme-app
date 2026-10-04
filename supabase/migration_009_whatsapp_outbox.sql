-- migration_009: fila de envio do WhatsApp (mensagens com hora marcada).
-- Motivo (04/10/2026): o acesso não pode chegar enquanto a compradora está na VSL do
-- upsell — a notificação tira ela da página de venda. A compra ENFILEIRA as mensagens
-- (send_after = agora + atraso) e o cron /api/whatsapp/outbox (a cada minuto) envia.
--
-- ATENÇÃO: body da mensagem de acesso contém a senha inicial até ser enviada; depois
-- do envio o servidor troca a senha por •••••• (coluna mask). Só service role acessa:
-- RLS ligada e SEM policy de propósito.

create table if not exists public.whatsapp_outbox (
  id bigint generated always as identity primary key,
  phone text not null,                    -- como a venda gravou (E.164 ou dígitos)
  kind text not null,                     -- 'acesso' | 'apoio' | futuros acompanhamentos
  body text not null,
  mask text,                              -- trecho sensível a apagar do body depois de enviar
  depends_on bigint references public.whatsapp_outbox (id) on delete set null,
  send_after timestamptz not null,
  claimed_at timestamptz,                 -- trava de quem está enviando (evita duplicar)
  sent_at timestamptz,
  attempts int not null default 0,
  last_error text,
  created_at timestamptz not null default now()
);

create index if not exists whatsapp_outbox_pending
  on public.whatsapp_outbox (send_after)
  where sent_at is null;

alter table public.whatsapp_outbox enable row level security;
