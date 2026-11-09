@AGENTS.md

## Revisão semanal do atendimento de WhatsApp (escada de autonomia, degrau 3)
- **Degrau:** 3, subido pelo Bruno em 30/10/2026 ("eu esqueci de vir pedir"; ele aceitou rodar sozinha). O degrau 2 (Claude faz quando
  pedido) nunca rodou porque dependia de ele lembrar.
- **O que roda sozinho:** segunda 8h (Brasília) o cron `/api/whatsapp/revisao` (`lib/revisao-semanal.ts`) junta as conversas da
  semana, separa as com sinal de erro, sorteia uma amostra, pede o diagnóstico ao Claude contra as regras atuais do agente e manda por
  e-mail (`ALERTA_EMAIL`) + aviso no WhatsApp do responsável. O relatório fica em `whatsapp_outbox` (kind `revisao-semanal-relatorio`).
- **O que NÃO é automático:** alterar regra, prompt ou código. Isso só acontece quando o Bruno decide e diz "aplica a revisão" no chat.
  Cada regra nova entra com o caso real, um teste em `scripts/testar-agente.ts` (rodar a bateria antes do deploy) e um "derruba se".
- **Critério de exceção (volta ao degrau 2):** o relatório não chegar numa segunda, ou 3 revisões seguidas sem item útil (aí vira
  burocracia e se rebaixa). Rodar manual: inserir em `whatsapp_outbox` uma linha `kind='revisao-semanal'`, `body='{"dias":14}'`.
- Feedback de aluna sobre o app/aulas vai para `docs/feedback-alunas.md`.

## Dono do bot de WhatsApp (Bruno, 09/11/2026)
- **Um chat só é dono do bot.** Hoje: o chat do suporte que construiu o agente (nome atual registrado na linha "DONO DO BOT" do `~/.claude/EM-ABERTO.md`).
- **Área do dono** (só ele edita): `lib/whatsapp-agent/`, `app/api/whatsapp/`, `lib/whatsapp-outbox.ts`, `lib/whatsapp-access.ts`, `lib/lembrete-24h.ts`, `lib/recuperacao-fila.ts`, `lib/cartao-aluna.ts`, `scripts/testar-agente.ts`.
- **Outros chats não editam esses arquivos.** Precisou de algo no bot → manda mensagem ao dono (SendMessage) ou escreve um handoff em `docs/` e avisa. Motivo: vários chats mexendo no bot ao mesmo tempo desorganizaram regras e textos.
- **Mudança de regra do bot** vem do Bruno e entra com caso real + teste em `scripts/testar-agente.ts` (ver revisão semanal acima).
- **Passagem de bastão:** quando o dono for trocado (contexto cheio, chat novo), o novo lê este bloco, a linha do quadro e a memória `onboarding-whatsapp-zapi`, e assume. Atualizar o nome na linha do quadro no mesmo turno.
