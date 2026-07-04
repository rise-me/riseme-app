-- Migration 004: fechar auto-concessão de acesso (vuln classe A10 / "cassino Lovable")
--
-- A policy "user_challenges_insert_own" deixava QUALQUER usuário logado inserir a
-- própria linha em user_challenges com access_type='lifetime' chamando a API REST
-- do Supabase direto (DevTools + curl), se dando acesso vitalício aos desafios pagos
-- sem pagar. getUserAccess() trata linha lifetime como acesso liberado.
--
-- Nenhum fluxo legítimo depende dessa policy: webhooks (hotmart/perfectpay) e o
-- painel admin escrevem com service_role, que ignora RLS. O cliente só LÊ a tabela.
-- Logo, remover a policy fecha o furo sem quebrar concessão nem admin.

drop policy if exists "user_challenges_insert_own" on public.user_challenges;

-- Fica valendo só a leitura da própria linha:
--   "user_challenges_select_own" ... for select using (auth.uid() = user_id)
-- Escrita passa a ser exclusiva do servidor (service_role).
