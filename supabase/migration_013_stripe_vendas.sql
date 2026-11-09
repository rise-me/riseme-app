-- Vendas pela Stripe (link de pagamento; 1º caso CL-PL, 09/11/2026).
-- Uma linha por Checkout Session paga. Serve a duas regras do Bruno para a Stripe (zero chargeback):
--   1) acesso SEM FALHA por WhatsApp E e-mail: a linha guarda o estado de cada canal; a conferência
--      (/api/stripe/conferencia, a cada 15 min) reenvia o que faltar e avisa o responsável se não sair;
--   2) reembolso sem atrito: a linha guarda o reembolso (quem pediu, estado na Stripe, aviso à aluna).
-- Só o servidor (service role) lê e escreve: RLS ligado e sem política.

create table if not exists public.stripe_vendas (
  session_id text primary key,                 -- cs_… (chave da idempotência do webhook)
  payment_intent text unique,                  -- pi_… (reembolso, disputa, aviso de fraude chegam por ele)
  payment_link text,
  email text not null,
  nome text,
  phone text,                                  -- E.164
  pais text,
  locale text not null,
  challenge_id text not null,
  oferta text,
  valor_centavos integer,
  moeda text,
  rastreio text,                               -- client_reference_id (quem lê é o dash)
  user_id uuid,
  conta_nova boolean,
  codigo text,                                 -- senha enviada; apagada quando os 2 canais confirmam (ou em 7 dias)
  email_id text,                               -- id do Resend
  email_ok boolean,
  email_erro text,
  email_tentativas integer not null default 0,
  wa_outbox_id bigint,                         -- linha 'acesso' em whatsapp_outbox
  wa_ok boolean,
  wa_erro text,
  wa_tentativas integer not null default 0,
  entregue_em timestamptz,
  alerta_em timestamptz,                       -- aviso ao responsável de canal que falhou (1x)
  reembolso_id text,                           -- re_…
  reembolso_status text,                       -- pending | succeeded | failed | canceled | requires_action
  reembolso_origem text,                       -- aluna-whatsapp | aluna-app | aviso-fraude | painel
  reembolso_pedido_em timestamptz,
  reembolso_avisado_em timestamptz,            -- mensagem final à aluna (só com status succeeded)
  reembolso_alerta_em timestamptz,             -- reembolso falhou → responsável avisado (1x)
  fraude_em timestamptz,                       -- radar.early_fraud_warning recebido
  disputa_em timestamptz,                      -- charge.dispute.created recebido
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists stripe_vendas_user_idx on public.stripe_vendas (user_id);
create index if not exists stripe_vendas_pendentes_idx on public.stripe_vendas (created_at) where email_ok is not true or wa_ok is not true;

alter table public.stripe_vendas enable row level security;
