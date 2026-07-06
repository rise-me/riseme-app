-- Migration 006: telefone da compradora (pra entregar o acesso via WhatsApp/Voxuy)
-- Capturado do payload do webhook de pagamento. Escrito só pelo servidor
-- (service_role); a policy de select da própria linha já cobre a leitura.

alter table public.users add column if not exists phone text;
