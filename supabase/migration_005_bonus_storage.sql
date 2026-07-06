-- Migration 005: bucket privado 'bonuses' pros PDFs de bônus (páginas-imagem + original)
--
-- Bucket PRIVADO (public=false): ninguém acessa os arquivos por URL direta.
-- O app gera signed URLs de curta duração pelo servidor (service_role), só depois
-- de checar canAccessBonuses(). Não criamos policy de cliente em storage.objects:
-- com RLS ligado e sem policy, anon/authenticated não leem nada (fail-closed) —
-- só o service_role (que ignora RLS) lê e assina. Igual às tabelas escritas só pelo servidor.

insert into storage.buckets (id, name, public)
values ('bonuses', 'bonuses', false)
on conflict (id) do nothing;
