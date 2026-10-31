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
