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

## LIGADO PARA AS ALUNAS 14/11/2026 ~15h00 BRT
Bruno viu a prévia da tela inteira (antes × depois) e aprovou: "pode fazer essas implementações… não acho que vai
melhorar muita coisa, não, mas piorar não vai". Inclui o aviso da senha como cartão. `CLASE_HOY_ATIVO=1` na Vercel
(Production) + deploy c9d3e8f; registros do servidor sem erro em /progress (es e pl) no primeiro minuto.
Antes de ligar, a regra do botão foi rodada contra as 6.741 contas reais: 4.298 "primeira aula", 2.371 "continua",
72 sem botão (desafio terminado); 51 contas têm dias pulados e por isso o botão abre a aula seguinte à mais adiantada
(contar aulas caía em dia já feito ou trancado).
Atenção para a leitura do "Tu cuidado" (26/11): as contas novas com dor também recebem este botão desde 14/11; ler o
efeito do cuidado como a DIFERENÇA entre com dor e sem dor no mesmo período (base 9,8% × 7,3%), não só o número bruto.

## O que foi construído (14/11)
- `lib/proxima-aula.ts`: qual aula o botão abre (continua o desafio do último treino; compradora nova = desafio comprado, dia 1).
- `components/home/ClaseDeHoy.tsx`: cartão no topo do Progreso, 3 estados:
  - **primera** (nunca treinou): "Tu primera clase · Día 1 · … · 14 min · [Empezar mi primera clase] · Toca el botón y sigue el video. Nada más."
  - **hoy**: "Tu clase de hoy · Día N · … · [Empezar la clase de hoy]"
  - **hecha** (já treinou hoje): "¡Hoy ya entrenaste! · Tu próxima clase: Día N · … · [Hacer otra clase hoy]"
- Com o cartão na tela, o aviso da senha (`FirstAccessNotice`) deixa de ser janela e vira cartão logo abaixo.
- Idiomas: es + pl (`CLASE_HOY_IDIOMAS`). Liga com `CLASE_HOY_ATIVO=1` na Vercel (Production) + redeploy; admin sempre vê
  (`lib/previa.ts`, a mesma regra do "Tu cuidado").
- Prévia local: `npm run dev` → `/dev-clase?estado=primera|hoy|hecha` (+ `&antes=1` = a tela de antes); mostra a tela inicial INTEIRA
  (`ProgressView`), não só o cartão. 404 em produção.

## Teste (linha no `~/.claude/MAPA-TESTES.md`)
Critério (proposto 14/11; Bruno: "pode fazer"): contas ES criadas depois de ligar, "1 aula em até 72 h entre as que entraram"
≥ 46% (1,2× a base de 38%); fracasso ≤ 38%. Leitura 24/11 (contas de 14/11 15h a 21/11 + 72 h).

## "Versión suave" (Bruno 15/11: opcional, só para quem acha difícil)
Há alunas que reclamam que a Calistenia é FÁCIL demais, então a trilha leve nunca aparece para todas. Ela é oferecida só
quando a aluna mostra dificuldade:
1. **"¿Cómo te fue hoy?"** no fim da aula (quando o dia é concluído): [Fácil] [Bien] [Muy difícil]. Construído 15/11
   (`components/challenges/ComoTeFue.tsx`), desligado até `COMO_TE_FUE_ATIVO=1` (admin vê). Guarda em
   `user_metadata.como_te_fue`. LIGADO 15/11 13h01 BRT (Bruno: "ficou boa… bem minimalistas, gostei"). Enquanto a trilha não existe, "Muy difícil" responde "Ve a tu ritmo: pausa el video…".
   Quando existir, "Muy difícil" oferece a versão suave ("¿Quieres probarla?").
2. Saiu antes da metade da aula → a oferta aparece 1 vez na próxima abertura (a fazer, quando houver trilha).
3. Bot: "es muy fuerte" / "no puedo" → aponta a versão suave (pedido ao Arquiteto, quando houver trilha).
Nome na tela: "versión suave", nunca "para principiantes"; conta como o dia; o desafio dela não muda.
Bônus: a pergunta mede fácil × difícil aula por aula (quais dias pesam; se muitas marcam "Fácil", abre uma versão mais puxada).
Aulas: Subidor transcrevendo os módulos 17, 40 e 61 desde 14/11 → `fabrica-dublagem/trabalho/empezando/RESUMO-EMPEZANDO.md`.
Prévia local: `npm run dev` → `/dev-aula/player/1`.

## Tela de conquista (dias 3, 7, 14, 21) — construída 15/11, desligada até CONQUISTA_ATIVO=1
Aparece ao sair da aula concluída (ou no fim do vídeo), uma vez por desafio e dia (`components/challenges/Conquista.tsx`).
O 28 fica de fora porque lá já existe a oferta do Pase. Textos com número só onde o dado sustenta (14/11, contas
10/10–06/11): "menos de 1 de cada 5" fazem 3 aulas na 1ª semana (17%, ES) e "1 de cada 10" chegam ao dia 7 (9,7%; PL 9%).
Botão "Invitar a una amiga" (só ES; link de indicação da aluna = momento de alegria, n2). Parabéns por WhatsApp: pedir ao
Arquiteto quando o WhatsApp voltar. Prévia: `/dev-aula/player/7?conquista=1`.

## Próximos (ordem combinada 14/11)
1. FEITO 14/11: Bruno viu e aprovou; ligado. Ler em 24/11.
2. Tela de conquista: construída 15/11 (ver acima), aguarda ok do Bruno; WhatsApp depois.
3. "Versión suave" (ver acima): Subidor transcrevendo os módulos 17, 40 e 61 (confirmou 15/11) → ler aula por aula → lista ao Bruno.
4. Aviso nos dias pesados da Calistenia (fase 2 do Tu cuidado): ler as 28 aulas uma a uma.
   Já se sabe (chat da CL-KR, 14/11): as aulas 11, 16, 17, 22 e 23 têm salto.
5. Consertos: títulos dos dias 3–4; dia 1 do Pilates em inglês; dia 20 da Calistenia ES = vídeo do dia 6 (Subidor).
