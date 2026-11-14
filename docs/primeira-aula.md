# "Tu clase de hoy": a primeira tela leva direto à aula (projeto de melhoria do produto)

> Aberto em 14/11/2026 (Bruno: "o que dá para ser feito agora já?" → ok na ordem: medir onde trava, Dia 0 guiado, tela de
> conquista, "Empezando de cero"). Dono: chat riseme-c2 [Melhoria de Produto]. Irmão do `docs/plano-personalizado.md`.

## O que a medição mostrou (banco, 14/11)
Contas com desafio criadas de 10/10 a 06/11 (n = 2.551; ES 2.482, PL 69), 1ª semana depois da compra:
- **80% entram no app** (20% nunca entram).
- **36% concluem 1 aula** (45% de quem entrou) → 44 de cada 100 compradoras entram e NÃO concluem aula nenhuma.
- 23% fazem 2 aulas, 17% fazem 3. De quem fez uma aula, 36% ficou só nela na 1ª semana.
- Compra → 1ª aula: mediana 23,6 h; metade faz nas primeiras 24 h.
- 97% das primeiras aulas são o dia 1 da Calistenia.

Base para o teste, "1 aula em até 72 h" entre as que entraram: ES 37,3% (10/10–06/11) e 38,9% (08–10/11, já com o
lembrete de 24 h do bot); PL 47,5% e 36,5% (n pequeno).

**Causa provável vista no código:** a tela inicial é "Progreso". Para a compradora nova ela mostra uma janela sobre a
senha por cima de tudo, sequência 0, semana vazia e "Sin desafíos en curso". Até a aula 1 são ~4 toques: fechar a janela,
"Explorar desafíos", escolher a Calistenia entre desafios trancados, "Empezar desafío".

**O que NÃO foi medido:** o que acontece dentro do player (vídeo que não carrega, sem som, saída no meio). Os eventos
existem no PostHog (`player_error`, `player_muted`, `challenge_started`, `workout_completed`, pageviews), mas o chat não
tem acesso de leitura: o Chrome do Bruno não está logado no PostHog (us.posthog.com). Com ele logado, dá para ler.

## O que foi construído (14/11, desligado para as alunas)
- `lib/proxima-aula.ts`: qual aula o botão abre (continua o desafio do último treino; compradora nova = desafio comprado, dia 1).
- `components/home/ClaseDeHoy.tsx`: cartão no topo do Progreso, 3 estados:
  - **primera** (nunca treinou): "Tu primera clase · Día 1 · … · 14 min · [Empezar mi primera clase] · Toca el botón y sigue el video. Nada más."
  - **hoy**: "Tu clase de hoy · Día N · … · [Empezar la clase de hoy]"
  - **hecha** (já treinou hoje): "¡Hoy ya entrenaste! · Tu próxima clase: Día N · … · [Hacer otra clase hoy]"
- Com o cartão na tela, o aviso da senha (`FirstAccessNotice`) deixa de ser janela e vira cartão logo abaixo.
- Idiomas: es + pl (`CLASE_HOY_IDIOMAS`). Liga com `CLASE_HOY_ATIVO=1` na Vercel (Production) + redeploy; admin sempre vê
  (`lib/previa.ts`, a mesma regra do "Tu cuidado").
- Prévia local: `npm run dev` → `/dev-clase?estado=primera|hoy|hecha` (404 em produção).

## Teste (linha no `~/.claude/MAPA-TESTES.md`)
Critério proposto (falta ok do Bruno): contas ES criadas depois de ligar, "1 aula em até 72 h entre as que entraram"
≥ 46% (1,2× a base de 38%); fracasso ≤ 38%. Leitura 10 dias depois de ligar (7 dias de contas + 72 h).

## Próximos (ordem combinada 14/11)
1. Bruno vê na conta admin e aprova → ligar.
2. Tela de conquista no dia 3 e no dia 7 (app) + parabéns por WhatsApp (pedido ao Arquiteto dos Fluxos).
3. "Empezando de cero": transcrição pedida ao Subidor 14/11 (módulos 40, 61, 17) → ler aula por aula → lista ao Bruno.
4. Aviso nos dias pesados da Calistenia (fase 2 do Tu cuidado): ler as 28 aulas uma a uma.
   Já se sabe (chat da CL-KR, 14/11): as aulas 11, 16, 17, 22 e 23 têm salto.
5. Consertos: títulos dos dias 3–4; dia 1 do Pilates em inglês; dia 20 da Calistenia ES = vídeo do dia 6 (Subidor).
