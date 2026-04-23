-- Migration 001: Permitir challenge_id como text em user_progress
-- Motivo: o catálogo do app ainda usa IDs mockados ('1'-'5'). Quando migrarmos
-- o catálogo pro Supabase (Fase 2), os IDs viram UUIDs — ambos caem no tipo text.

-- 1. Drop FK constraint (não queremos integridade referencial enquanto catálogo é mock)
alter table public.user_progress drop constraint if exists user_progress_challenge_id_fkey;

-- 2. Altera tipo da coluna pra text
alter table public.user_progress alter column challenge_id type text using challenge_id::text;
