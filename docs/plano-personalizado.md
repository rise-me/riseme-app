# Plano personalizado dentro do desafio (projeto de melhoria do produto)

> Aberto em 11/11/2026 a pedido do Bruno: "a gente tem que entregar um produto que seja surpreendentemente bom"; "isso é o prioritário em termos de produto". Projeto paralelo à venda: a venda continua.
> Dono: chat riseme-c2 (este projeto). Aulas no R2/dublagem: chat "Subidor de aulas APP RiseMe". Bot: dono do bot (ver `CLAUDE.md`).

## Por quê (dados)
- Quiz CL-ES desde 10/10 (55.937 chegaram à pergunta 13): **joelho sensível 40%**, **costas 21%**, um dos dois **50%**; **nunca se exercita 41%**; 40+ 53%; nunca fez calistenia 91%.
- A Calistenia (28 aulas) vai de Iniciante a **Avançado** nos dias finais (nomes dos arquivos no Drive). Todo mundo recebe a mesma trilha.
- Queixas reais: 15 comentários na Hotmart "respondí el test con rodillas/espalda y la rutina no lo considera" (25/10); "ritmo rápido p/ iniciante" (relatório semanal 09/11); a enquete do grupo apontou a mesma dor (Bruno 11/11).
- Retenção (05/11, conferir de novo): 40% fazem o dia 1, 8% chegam ao dia 7.

## Decisão de estrutura (Bruno 11/11: "gostei desse plano, está adequado")
**Nada é substituído.** O desafio comprado fica intacto (28 aulas). O que ela marcou (joelho, costas) libera **"Tu cuidado"**, um módulo complementar de presente, ligado à ALUNA, não ao desafio: aparece dentro de qualquer desafio que ela tiver (Calistenia, Pilates…).

```
Calistenia 28 días            ← o que ela comprou, intacto
 └─ Tu cuidado: Rodillas      ← presente, marcou joelho (12 aulas)
 └─ Tu cuidado: Espalda       ← presente, marcou costas (19 aulas)
```
- **Quem recebe:** quem marcou joelho/costas no quiz (pré-preenchido quando a venda tem o quiz, ~31% hoje) ou na pergunta do 1º acesso no app (cobre as outras). Quem não marcou não vê.
- **Fase 1:** "Tu cuidado" como seção própria, com progresso próprio; ela faz quando quiser. Mais de 28 aulas = overdeliver.
- **Fase 2:** nos dias em que a aula do desafio pesa no joelho/costas, um aviso: "Si hoy te molesta la rodilla, haz esta clase de tu cuidado. También cuenta como tu día." A aula original continua lá; é opção a mais, nunca troca forçada.
- **Pase:** os mesmos vídeos (mesma dublagem) também viram desafios próprios no Pase para qualquer assinante ("Rodillas Fuertes", "Espalda Sin Dolor"). Desafios grandes (Pilates Menopausa, Abdominais de Pé…) ficam só no Pase, não viram presente.

### Explicar de um jeito que TODA aluna entenda (Bruno 11/11)
Parte do público tem pouca familiaridade com app. Regras para as telas:
- Uma ideia por tela, frase curta, sem palavra técnica ("módulo", "complementar", "progresso" não aparecem).
- Dizer o PORQUÊ com o que ela mesma disse ("nos contaste que te duelen las rodillas").
- Dizer o que fazer e o que NÃO muda ("tu desafío sigue igual").
- Mostrar uma vez, na hora em que libera (aviso grande, com botão), e deixar um texto fixo de 1 linha no topo da aba.

Rascunho (ES, para o Bruno revisar; PL depois por nativa):
- **Aviso ao liberar:** "🎁 Un regalo para ti · Nos contaste que te duelen las rodillas. Por eso preparamos 12 clases suaves para cuidarlas. Tu desafío sigue igual: esto es un extra. [Ver mis clases]"
- **Texto fixo no topo da aba:** "Clases extra para cuidar tus rodillas. Hazlas cuando quieras, además de tu desafío."
- **Aviso no dia pesado (fase 2):** "¿Hoy te duele la rodilla? Puedes hacer esta clase suave en lugar de la de hoy. También cuenta como tu día."
- **Pergunta do 1º acesso (sem quiz):** "¿Te duele alguna parte del cuerpo al hacer ejercicio? [Rodillas] [Espalda] [Las dos] [No]"

## Material (Drive: `00 - RiseMe™/Projetos/[RiseMe™ - Central Absoluta]/01 - Produto Central & Repositório/01 - Todos os módulos`, 80 módulos)
| Versão | Módulo | Aulas |
|---|---|---|
| Rodillas | 38 Proteção nos Joelhos | 12 |
| Espalda | 37 Proteção nas Costas · 07 Alívio das Dores nas Costas | 12 + 7 |
| Empezando de cero (fase 2) | 40 Caminhada Interior · 61 Pilates Básico · 17 Treinos Rápidos | 15 · 10 · 27 |
| Extras (1 por aluna, fase 3) | 52 Abdominais de Pé · 69 Pilates Menopausa · 39 Alongamentos · 45 Recuperação | 28 · 28 · 17 · 23 |
Só os nomes dos arquivos foram vistos. **Assistir/transcrever antes de prometer.**

## Idiomas (Bruno 11/11)
ES e PL são os prioritários: as versões nascem em **es + pl** (en como padrão para os outros).

## Fases
1. **Conferir o material:** assistir/transcrever as 12 de Joelhos + 19 de Costas (baixo impacto de verdade? qualidade boa para dar de presente? duração?). Processamento pesado: no Air M1 ou de madrugada no Mac principal.
2. Dublar em es + pl e subir no R2 (Subidor de aulas).
3. App: pergunta do 1º acesso + aba "Tu cuidado" em qualquer desafio, com as telas acima.
4. Bot sabe o cuidado da aluna (pedido ao dono do bot).
5. Teste no `~/.claude/MAPA-TESTES.md` antes de ligar.
6. Fase 2: aviso nos dias pesados (marcar a carga de cada dia da Calistenia pelo texto já em `lib/whatsapp-agent/aulas-calistenia.json`). Depois: Empezando de cero.

## Pase: cadência de desafios novos
Meta desde 15/10: 1 a 4 desafios novos por semana do catálogo do Drive. **Não está acontecendo** (só pré-parto, pós-parto e kegel entraram). Bruno 11/11: "pelo menos 1 por semana, 2 por semana. A gente tem que fazer isso."

## Mac Air M1 parado (Bruno 11/11)
O gargalo de processamento é a regra "processamento pesado só 23h–7h no Mac principal" (o Mac travou em 19/10). Com o Air M1 parado, a transcrição, a dublagem e a subida podem rodar o dia inteiro, uma fila só, sem tocar no Mac principal. Plano a fechar com o Subidor de aulas.

## Combinado com o Subidor de aulas (11/11)
- **Ele:** baixa (22,7 GB, desde 11/11 09:18), transcreve (23h no Mac principal ou no Air M1 por SSH) → `~/Ferramentas/fabrica-dublagem/trabalho/{joelhos,costas,costas-alivio}/transcricao-real/` + resumo `~/Ferramentas/fabrica-dublagem/trabalho/cuidado/RESUMO.md` (duração, exercícios, impacto); depois dubla es + pl e sobe no R2; ficha e registro são dele. Cadência do Pase e Air M1 também (fila: menopausa → Joelhos/Costas → catálogo).
- **Formato:** cada módulo = desafio próprio no `hls-lessons.json`, sem variante: **id 10 = Joelhos, 11 = Costas, 12 = Alívio das Costas** (8 = menopausa, reservado). A aba "Tu cuidado: Espalda" aponta para 11 + 12.
- **Eu (riseme-c2):** leio o RESUMO, faço a tela e a regra de quem recebe.
- **Sobem TODAS as 31 aulas** (Bruno 11/11). A leitura do RESUMO só barra exceção clara (impacto alto que contradiz "cuidado", vídeo com defeito); exceção vai ao Bruno antes de cortar. Sem exceção → o Subidor dubla tudo direto.

## Leitura parcial das transcrições (11/11 ~14h40: Joelhos 12/12, Costas 7/12; fala em inglês)
- **Impacto: ok.** Nenhum salto de verdade ("low impact jumping jacks" nas aulas 05 e 12 de Joelhos), agachamento só até a metade, muito exercício deitada no chão. 16–22 min por aula. Costas 06 tem afundo (lunge): ok para costas.
- **Ajoelhar:** algumas aulas de Joelhos têm prancha apoiada no joelho ou ficar ajoelhada (03, 09, 10, 11). Para quem tem joelho sensível, uma dica na tela/bot resolve: "si apoyar las rodillas te molesta, pon una toalla doblada debajo".
- **Equipamento (o achado que importa):** a Calistenia é vendida SEM equipamento, e 7 das 19 aulas usam algum: halteres (Joelhos 01, 06), bola suíça (03, 04), elástico (Joelhos 07, 09, 10; Costas 07). Cadeira aparece em várias, mas é coisa de casa. → **DECIDIDO (Bruno 11/11): sobem todas, com 1 linha de alternativa** em cada aula com equipamento ("¿Sin pesas? Usa 2 botellas de agua"; "¿Sin banda? Hazlo sin ella, más despacio") — "pode ser que a pessoa tenha". Ideia dele: no futuro, vender os equipamentos (ver `docs/roadmap.md`). Dica da toalha nas aulas com joelho no chão.

## Leitura completa (RESUMO.md do Subidor, 11/11 tarde) e decisão do Bruno
- A leitura por palavra-chave (acima) estava rasa. Lidas aula por aula: **Joelhos e Costas são tonificação geral de baixo impacto, não cuidado** (sem adaptação para dor; 5/12 e 9/12 com ALERTA de carga no joelho/coluna; ajoelhar em quase todas). **Alívio** é cuidado de verdade nas aulas iniciantes. Detalhe: `~/Ferramentas/fabrica-dublagem/trabalho/cuidado/RESUMO.md`.
- **DECIDIDO (Bruno 11/11, "pode seguir"):**
  1. **Tu cuidado: Espalda = 6 aulas sem alerta:** A01, A02, A03 (Alívio, iniciante) + C09, C11, C12 (Costas).
  2. **Tu cuidado: Rodillas = a montar** com os módulos de reabilitação de joelho do Drive: 11 Menisco (7, aulas 1–3 iniciante) e 08 Osteoartrite (7, aulas 1–3 iniciante) + **ioga na cadeira bem leve como complemento** (ideia do Bruno): 79 Ioga na Cadeira para Iniciantes (32) e as iniciantes do 46 Ioga na Cadeira. O app já tem "Yoga en la Silla" (desafio 4, 28 aulas, ES no YouTube): conferir se é o módulo 46 (aí o ES já existe). Transcrever no Air e escolher só as leves.
  3. **As 31 sobem no Pase** como desafios normais, com nome honesto (ex.: "Tonificación de bajo impacto"), na fila de cadência do Subidor. Não são "cuidado".

## Rodillas: proposta de lista (12/11, a partir do `~/Ferramentas/fabrica-dublagem/trabalho/rodillas/RESUMO-RODILLAS.md`, 60 aulas lidas)
Só aulas que servem INTEIRAS (sem corte), em ordem de progressão. **APROVADA pelo Bruno 12/11** (Espalda 6 + Rodillas 12 = 18 aulas de presente).
- **Parte 1 · Alivio (sentada/deitada, iniciante):** Y01 Ioga sentada restauradora (10,5) · Y02 Posturas para a artrite (10,5) · Y04 Sem dores (8,7) · M01 Começo da recuperação do joelho (12,1) · O02 Desbloquear o movimento do joelho (23,5) · O01 Recuperação suave (27,8) · Y17 Mobilidade na cadeira (19,9)
- **Parte 2 · Movimiento suave (no sofá/cama, sem descer ao chão):** S03 Quadril rígido (23,3) · S05 Adulto ativo (24,1) · K02 Fluxo sem stress (22,6) · S10 Mestres da mobilidade (23,1) · K12 Coluna saudável, pernas tonificadas (31,0)
- **Reserva (inteiras, mais puxadas ou parecidas):** S07, S11, K09, Y09, Y10, Y15, Y16, Y18. Cortadas (M02, M03, O03, 7 do Sofá, 10 da Cama) ficam de fora por simplicidade.
- **Na dublagem:** Y (= desafio 4 "Yoga en la Silla", dias 1–19) já tem ES → só PL; Cama fala "sofa" → trocar por "cama"; Menisco fala "injured leg" → "la pierna que te molesta". Equipamento (M01/O01 rolo + peso de tornozelo, O02 peso) → linha de alternativa no app.

## Perguntas para o chat "Subidor de aulas APP RiseMe" (respondidas acima)
1. Qual é o fluxo hoje, do Drive à aula no app (fábrica de dublagem → R2 → `hls-lessons.json`)? Quais passos são pesados (Whisper, ffmpeg, render do cartão)?
2. Dá para rodar esse fluxo no Air M1, com o que ele precisa (repo, rclone, chaves, ElevenLabs, R2)? Quem prepara a máquina?
3. Uma aula pode ter mais de uma versão no mesmo dia (ex.: `1/5` normal e `1/5-rodillas`)? Qual formato você sugere no `hls-lessons.json`?
4. O que trava a cadência de 1–2 desafios por semana no Pase hoje?

## LIGADO PARA AS ALUNAS 12/11 ~21h48 BRT
- 18 aulas no R2 (Subidor, commits 4bf6e88 + 6d228ea), conferidas tocando: es (12 R2 + 4 ioga YouTube) e pl (18 R2), todas respondendo. `CUIDADO_ATIVO=1` gravado na Vercel Production + redeploy (riseme.app). O bot liga junto (d0d7eb4).
- **Base do teste (medida 12/11):** contas criadas 01–28/10 com quiz guardado, dia 7 em até 14 dias: COM dor 9,8% (16/164; joelho 10,5%, costas 16,7%, as duas 4,4%) × SEM dor 7,3% (12/164). Fez o dia 1: 40% × 39%. Meta do teste: 1,5× = ≥ 14,7% nas contas novas com dor, a partir de 13/11; n pequeno, ler em 26/11 (14 dias) com as contas de 13/11 em diante que já tiverem 14 dias.
- Trechos que os revisores pediram pra ouvir no vídeo (Subidor 12/11): sofá 15·5 "Revolved head of the knee" (fala diz "alarga el costado izquierdo"); osteo 14·2 "Rotations" (ambíguo como o original); cama 16·12 "Side-lying thoracic rotation" (ela está de costas). Corrigir só se alguém reclamar.

## ESTADO 12/11 noite (antes de ligar): aba NO AR desligada para alunas (só admin vê); Bruno aprovou as telas ('pode seguir assim, depois se precisar de ajuste a gente faz')
- **Código:** `lib/cuidado.ts` (listas 6+12, quem recebe, idiomas es+pl), `lib/cuidado-server.ts`, `components/challenges/CuidadoNoDesafio.tsx` (pergunta · cartão · aviso 🎁), rotas `app/[locale]/(app)/cuidado/[tipo]` (lista) e `/player/[n]` (o mesmo VideoPlayer, sem trava de ordem e sem oferta do Pase), textos `cuidado` nos messages (es/pl/en/pt-BR; tr/cs/it = en, aba desligada lá). Progresso em `user_progress` com challenge_id `cuidado:<desafio>` e dia = aula do módulo (conta na sequência, não vira "desafio ativo").
- **Liga como:** só para quem comprou (Pase ou desafio) e marcou joelho/costas (quiz `problemas_fisicos` ou pergunta no desafio); aparece só com `CUIDADO_ATIVO=1` na Vercel OU para admin (prévia do Bruno em produção). Aula aparece só se existe no idioma dela.
- **Hoje em ES:** 4 aulas (Y01, Y02, Y04, Y17 do YouTube do desafio 4). O resto aparece sozinho quando o Subidor publicar no R2 com os ids 11 Costas · 12 Alívio · 13 Menisco · 14 Osteo · 15 Sofá · 16 Cama (en+es+pl) e 17 = ioga na cadeira SÓ PL (dias 1, 2, 4, 17), CONFIRMADOS pelo Subidor 12/11. O PL da ioga não vai no desafio 4 para não trocar o espanhol do YouTube por inglês em quem comprou o "Yoga en la Silla".
- **Prévia local:** `npm run dev` → `/dev-cuidado?tela=pergunta|aviso|cartao|lista&tipo=rodillas|espalda&simula=1` (404 em produção). Prints mandados ao Bruno 12/11.
- **Feito 12/11:** telas aprovadas; PL revisado por nativa (aba "Troska o siebie"); títulos finais do Subidor; dono do bot avisado de `user_metadata.cuidado`; commit + push com a aba desligada.
- **LIGAR SEM NOVO OK (Bruno 12/11: "quando estiverem prontas não precisa do meu aval para publicar. Pode subir e publicar"):** quando o Subidor avisar que as 18 estão no R2, o riseme-c2 confere cada aula tocando (es e pl), mede a base do dia 7 e liga para as alunas com **CUIDADO_ATIVO=1 na Vercel (Production) + redeploy** (NÃO por constante no código: o bot usa a mesma chave, d0d7eb4 do Arquiteto), e avisa o Bruno e o Arquiteto dos Fluxos depois (ele confere numa conversa real).
- **Falta:** as 18 aulas no R2 (Subidor publica uma a uma) → Bruno grava `CUIDADO_ATIVO=1` na Vercel (Production) + redeploy para ligar para as alunas; na véspera, medir a base do dia 7 (MAPA-TESTES).

## (histórico) RETOMAR DAQUI: implementação no app (riseme-c2, 12/11; Bruno "pode executar")
O que se sabia antes de escrever:
- **Rotas:** `app/[locale]/(app)/challenges/[id]/page.tsx` (servidor: acesso + progresso) → `ChallengeDetailClient.tsx` (cabeçalho + lista de dias). Player: `challenges/[id]/player/[day]/page.tsx` (trava `canAccessChallenge` + trava sequencial + `signLessonPath` p/ HLS) → `VideoPlayer.tsx` (584 linhas; `markDayComplete` de `lib/progress`, oferta do Pase nos dias 1/final/2).
- **Acesso:** `lib/user-access-server.ts` (`getUserAccess`, `canAccessChallenge`: grátis | Pase ativo | `user_challenges` lifetime). As aulas Y (= desafio 4 dias 1, 2, 4, 17) NÃO abrem para quem não tem o desafio 4 → "Tu cuidado" precisa de rota/permissão própria, não do player do desafio.
- **Aulas:** `lib/mock-challenge-days.ts` (`getMockDays`, prioridade HLS > Stream > YouTube; `hlsFor` por desafio/dia/idioma; `AUDIO_PADRAO='en'`). Registro R2 em `lib/hls-lessons.json` (dono: Subidor).
- **Quiz:** `lib/quiz-contexto.ts` (`user_metadata.quiz.respostas`; CL-ES tela 13 = `problemas_fisicos`: `rodillas_sensibles` / `espalda_sensible` / `ninguna...`; CL-PL tem mapa próprio em `lib/quiz-mapas/cl-pl.json`, ler pela chave, não pelo nº da tela).
Desenho previsto (a confirmar com o Bruno pelas telas):
1. `lib/cuidado.ts` = fonte única: listas Espalda (6) e Rodillas (12) como {desafio, dia} + quem recebe (`user_metadata.cuidado` = {rodillas, espalda}, preenchido pelo quiz ou pela pergunta do 1º acesso).
2. Pergunta do 1º acesso (modal no detalhe do desafio quando `cuidado` não existe) → grava em `user_metadata`.
3. Cartão "🎁 Tu cuidado: Rodillas/Espalda" no detalhe de QUALQUER desafio → página `/[locale]/cuidado/[tipo]` com a lista e player próprio (sem trava sequencial, sem oferta do Pase), progresso próprio.
4. Aula só aparece quando existe no idioma dela (es/pl; en p/ os outros); Y já tem ES no YouTube.
5. Linha de alternativa de equipamento por aula + dica da toalha; textos ES do rascunho acima; PL por nativa.
6. Ler `node_modules/next/dist/docs/` antes de escrever (AGENTS.md: Next com mudanças). Não publicar sem ok do Bruno; mostrar print das telas antes.
