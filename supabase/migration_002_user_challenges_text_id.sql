-- Migration 002: user_challenges.challenge_id → text (aceita mock IDs agora, UUIDs depois)
-- Mesmo raciocínio do migration_001 pra user_progress.

alter table public.user_challenges drop constraint if exists user_challenges_challenge_id_fkey;
alter table public.user_challenges alter column challenge_id type text using challenge_id::text;
