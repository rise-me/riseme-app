# Handoff — chat "[Fila Técnica] Bot no WhatsApp" (criado 05/11/2026)

Escrito para: o chat novo do Claude na pasta `~/Produtos/Apps/riseme`, que passa a ser o dono dos tickets técnicos do
suporte de WhatsApp. O chat de atendimento (riseme, "organizar a casa") continua dono dos fluxos do bot.

## O que é a fila técnica

O bot do suporte (Z-API + Claude, `lib/whatsapp-agent/`) resolve sozinho os problemas técnicos que batem com a lista de
bugs conhecidos. O que não resolve vira um TICKET: uma linha em `whatsapp_consultas` com `motivo` começando por
`TÉCNICO — ` e `status = 'pendente'`. Esses tickets NÃO vão para a lista das 20h do Bruno. São deste chat.

A aluna já ouviu do bot: "lo paso al equipo técnico y te aviso por aquí cuando esté resuelto", com a playlist do YouTube
como plano B (alunas em espanhol). Ninguém prometeu prazo. A conversa continua com o bot para o resto.

## Como operar (da raiz do repo, com `.env.local`)

```bash
npx tsx --env-file=.env.local scripts/fila-tecnica.ts                      # lista os tickets com as últimas 10 mensagens e a conta
npx tsx --env-file=.env.local scripts/fila-tecnica.ts responder 147 "texto no idioma dela"   # manda pela fila e fecha o ticket
npx tsx --env-file=.env.local scripts/fila-tecnica.ts fechar 143           # fecha sem mandar nada (resolvido por fora)
```

O envio sai por `whatsapp_outbox` (kind `manual`), processado pelo cron a cada minuto; a chave da Z-API só existe na Vercel.
Para mandar imagem ou pedir print não há atalho: texto só.

## Bugs conhecidos (o que o bot já diz sozinho)

Arquivo `lib/whatsapp-agent/bugs-conhecidos.ts`: 6 sintomas (B1–B6) com `status` (`contorno` / `investigando` /
`corrigido`), contorno e resposta pronta. Vira bloco no CONHECIMENTO do bot. **Quem corrige no app atualiza o status
ali** (e a data). Corrigiu um bug → `status: 'corrigido'` + `desde: 'DD/MM/AAAA'`; o bot passa a dizer que foi corrigido e
pedir para recarregar; se persistir, ticket.

Levantado das 37 consultas técnicas de outubro (de 152):
- B1 riseme.app em branco / "No se puede acceder" / login volta ao início → navegador interno do WhatsApp no iPhone; contorno Safari/Chrome.
- B2 vídeo não carrega / "Video no disponible" / tela preta → investigando (vídeos ES no YouTube; PL/CZ/IT em HLS no R2, ver `lib/mock-challenge-days.ts`).
- B3 vídeo corta aos ~7–8 min ou pula para o dia seguinte (relatos em polonês) → investigando.
- B4 aba Extras vazia em inglês com Protocolo liberado → investigando (suspeita: app aberto em outro idioma).
- B5 progresso/dia errado → regra dos 80% + calendário em UTC (explicação, não bug).
- B6 vídeo sem som no Android → contorno (ícone de som do player, volume de mídia).

## Tickets abertos agora (05/11 noite)

- **#147 Velia García Montelogo** (+5218777936445, MX, Calistenia en Casa, 1 dia feito): tela preta ao abrir os vídeos no
  app instalado, Android; já fechou/reabriu e trocou conexão; treinou pela playlist. Quer o app.
- **#149 Derly Gómez** (+573239474835, CO, derlymautg@gmail.com, Calistenia en Casa, Android): vídeo sem som mesmo subindo
  o volume; já tentou as dicas; sem Wi-Fi para espelhar na TV.
- #143 Martha: fechado (entrou sozinha com o link novo).

## Regras do Bruno que valem aqui

- Nunca o nome "Bruno" para alunas: "nós", "a equipe". Idioma dela (es/pl/cs/it/tr/en); emoji só no fim da frase, 1–2 por mensagem; links completos com `https://`.
- Nada de segredo em chat: chaves ficam na Vercel; o que precisar de chave roda pela fila (`whatsapp_outbox`) ou é ele que grava com `npx vercel env add`.
- Processamento pesado no Mac (vídeo, ffmpeg, Whisper) só 23h–7h.
- Mudança no bot (prompt, conhecimento, `bugs-conhecidos.ts`) é do chat de atendimento, exceto o status dos bugs, que é deste.
- Commit só dos próprios hunks; mensagem termina com `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Concluiu/mudou algo → linha no `~/.claude/EM-ABERTO.md` no mesmo turno (L2).

## Onde está cada coisa

- Mapa do WhatsApp (fluxos, erros, propostas): https://claude.ai/artifact/5xZ3L9FK3zZkcoELeeJxkq
- Player/vídeos: `lib/mock-challenge-days.ts` (provider youtube/stream/hls), `lib/hls-lessons.json`, `lib/stream-lessons.json`, `lib/hls-token.ts`.
- Pesquisa sobre áudio por idioma e bugs do iOS no player: `docs/pesquisa-video-multiaudio.md`.
- Histórico de uma conversa: tabela `whatsapp_messages` (phone em várias formas: `variantesTelefone` em `lib/whatsapp-agent/conversa.ts`).
- Estado vivo das pendências: `~/.claude/EM-ABERTO.md`, linha "PLANO DE EXECUÇÃO" item (3) e a linha deste chat.
