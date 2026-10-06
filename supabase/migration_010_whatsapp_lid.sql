-- migration_010: LID do WhatsApp em cada conversa.
-- O WhatsApp às vezes identifica o contato por um LID (id privado, "1453…@lid") no lugar do
-- telefone — principalmente no webhook "enviada por mim" quando uma PESSOA responde pelo
-- celular. Sem guardar o LID, essa resposta não casa com o chat da aluna e o bot não percebe
-- que deve se calar. O LID não converte em telefone; só dá pra guardar quando os dois vêm juntos.

alter table public.whatsapp_chats add column if not exists lid text;
create index if not exists whatsapp_chats_lid on public.whatsapp_chats (lid);
