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
LISTA APROVADA pelo Bruno 15/11 (10 aulas inteiras, sem equipamento além de cadeira/parede, sem ajoelhar nem salto; o
Pilates Básico saiu porque as 10 pedem equipamento): C07, C01, R15, C05, R02, C14, R21, C09, C08, C15 (C = Caminhada
Interior, id 18 no R2; R = Treinos Rápidos, id 19; dia = nº da aula no módulo). Subidor: tradução es+pl rodando 15/11;
dublagem depois do crédito com o Bruno. LIGAR SEM NOVO OK (Bruno 15/11: "sim"): quando o Subidor avisar que as 10 estão no R2, o riseme-c2 toca cada aula (es e pl) e liga SUAVE_ATIVO=1 + redeploy, e avisa o Bruno e o Arquiteto (bot passa a apontar a versión suave em 'es muy fuerte'). APP PRONTO 15/11, desligado até SUAVE_ATIVO=1 (e só mostra aula que existe no
idioma): `lib/cuidado.ts` tipo 'suave', página `/cuidado/suave`, "Muy difícil" oferece "¿Quieres probarla?" quando há aula.
LIGADA 16/11 18h14 BRT: 10 aulas no R2 (a001bde, voz do Google), conferidas em es e pl (playlists inteiras, volume −21 a −26 dB,
trecho de 30 s de cada uma transcrito no idioma certo); SUAVE_ATIVO=1 + redeploy. Bot já sabe (Arquiteto e24aabd, ok do Bruno):
oferece a suave só a quem acha pesado; títulos ES, saltos 25/27 e áudio EN de 2/4/5 no conhecimento.
REGRA: mudou título de dia da Calistenia → rodar `npx tsx scripts/gerar-aulas.mts` e avisar o Arquiteto (o JSON é do bot). Ler junto com o 'Tu clase de hoy' (24/11): quantas marcam "Muy difícil", quantas abrem a suave, quantas concluem.
Prévia local: `npm run dev` → `/dev-aula/player/1`.

## Tela de conquista (dias 3, 7, 14, 21) — LIGADA 15/11 (textos do dia 7 e 14 escritos pelo Bruno: "grupo selecto"; es e pl aprovados por ele)
Aparece ao sair da aula concluída (ou no fim do vídeo), uma vez por desafio e dia (`components/challenges/Conquista.tsx`).
O 28 fica de fora porque lá já existe a oferta do Pase. Textos com número só onde o dado sustenta (14/11, contas
10/10–06/11): "menos de 1 de cada 5" fazem 3 aulas na 1ª semana (17%, ES) e "1 de cada 10" chegam ao dia 7 (9,7%; PL 9%).
Botão "Invitar a una amiga" (só ES; link de indicação da aluna = momento de alegria, n2). Parabéns por WhatsApp: pedir ao
Arquiteto quando o WhatsApp voltar. Prévia: `/dev-aula/player/7?conquista=1`.

## "Versión intensa" (Bruno 16/11: "pode começar pelo passo 1") — RETOMAR DAQUI
Espelho da versión suave: oferecida só a quem marca "Fácil" no fim da aula ("¿Quieres algo más intenso? Tenemos clases
rápidas tipo tabata"). Origem: Monika (PL) pediu reembolso 16/11 dizendo "muito lento; intervalos ou tabata seria ótimo";
2 alunas em 11/11 acharam fácil demais. Passos: (1) FEITO o pedido ao Subidor 16/11: inventário de HIIT/tabata nos 80
módulos do Drive (só pelos nomes); Subidor confirmou 16/11 que está rodando → `fabrica-dublagem/trabalho/empezando/INVENTARIO-INTENSA.md`.
FEITO 16/11, leitura das fortes do rapidos17 (RESUMO-EMPEZANDO.md):
- Sem equipamento, 5–11 min: R16 Prancha 5,2 · R18 Costas/braço 6,9 · R20 Cabeça aos pés 7,7 · R22 Aquecimento 5,7 ·
  R24 HIIT Rápido 11,1 · R25 Núcleo Forte 10,1 · R27 HIIT Silencioso 7,5 · R28 Prancha 10,0 (+ R13 Burpee walk 3,9, iniciante).
- Com equipamento (fora ou com aviso): R17 faixa+halter · R19 halteres · R23 halteres · R26 banco + 2 min sem fala.
- O que NÃO são: tabata. Blocos de 30–60 s, sem 20/10; o "HIIT" de R24/R27 é caminhado, sem pulo. Cardio de verdade só
  R20 (marcha alta, polichinelo sem pulo, salto lateral). É uma trilha de FORÇA/CORE curta, não de intervalo.
- Leitura: dá pra montar uma "versión intensa" de ~8 aulas curtas só com o rapidos17 (atende "muito lento"), mas "tabata"
  de verdade depende do inventário do Subidor.
INVENTÁRIO PRONTO 16/11 (`fabrica-dublagem/trabalho/empezando/INVENTARIO-INTENSA.md`, só por nome): 43 Tabata (15, 5 por nível;
5 são arquivos da própria Calistenia: dias 8, 9, 20, 21, 24) + 53 Cardio (23 = as 15 do Tabata + 8 próprias) = 23 distintas,
18 fora da Calistenia; depois 31 Boxe (4 com HIIT/cardio no nome), 03 Fitness em Casa (~15 de 86), 24/64/58 menores.
Pastas VAZIAS no Drive: "33 - HIIT pelo Yaroslav", Corrida, Passadeira → perguntar ao Bruno onde está.
PEDIDO 16/11 ao Subidor: transcrever no Air as 18 (duração, 20/10 de verdade?, salto, equipamento, nível × Calistenia) e
conferir se as 5 coincidentes são os mesmos arquivos. Sem dublar até a decisão do Bruno (~23/11).
16/11 (Bruno confirmou ao Subidor): MD5 confirma 53 aulas 8/9/20/21/23 = Calistenia dias 8/9/20/21/24; o 43 está todo dentro
do 53. As 18 restantes do 53 (1–7, 10–19, 22) indo pro Air; transcrição depois da dublagem da suave →
`fabrica-dublagem/trabalho/intensa/RESUMO-INTENSA.md`.
(2) ~23/11: ler quantas marcam "Fácil" em `user_metadata.como_te_fue` → Bruno decide;
CONTAGEM 25/11 (user_metadata.como_te_fue, desde 15/11): 1.041 alunas responderam, 3.195 respostas. "Fácil" 650
respostas (20%) de 309 alunas (30% de quem respondeu) · "Bien" 2.304 (72%) · "Muy difícil" 241 (8%) de 164 alunas.
Quase tudo na Calistenia (desafio 1). Por idioma: PL "Fácil" 22% (591 de 2.663) × ES 11% (59 de 529). Versión suave
(oferecida no "Muy difícil" desde 16/11): 19 alunas concluíram 31 aulas. RESUMO-INTENSA do Subidor ainda não saiu
(fila parada atrás do Pase 31; Air sem SSH em 25/11) → Bruno decide a intensa com a contagem; o resumo vem depois.
DECIDIDO 25/11 (Bruno: "pode furar a fila"): versión intensa = 7 aulas do rapidos17 (R16 R18 R20 R24 R25 R27 R28),
na frente do Pase 31 e do 2/4/5; Air religado pelo Bruno 25/11 (62 GB livres). Chat do Subidor FECHADO → pedido
escrito em `fabrica-dublagem/trabalho/intensa/HANDOFF-INTENSA-RAPIDOS.md` + topo da FILA.md. RETOMAR (riseme-c2):
Bruno abre o Subidor → ele dubla e sobe (desafio 20) → eu monto tipo 'intensa' em lib/cuidado.ts (oferta no "Fácil",
igual à suave, flag INTENSA_ATIVO desligada) → prévia da tela inteira com o antes ao lado → ok do Bruno → ligar.
(3) lista → dublagem es+pl → oferta no "Fácil" (mesma estrutura do tipo 'suave' em lib/cuidado.ts).
CUSTO (Subidor 16/11): a voz das aulas agora é do Google (aprovada pelo Bruno); 28 aulas es+pl cabem na cota grátis do
mês. ElevenLabs deixou de ser trava pra aula (fica pra criativo/VSL). Vale também pra dublar Pilates/Yoga/Cuerpo Sexy (2/4/5).

## Próximos (ordem combinada 14/11)
1. FEITO 14/11: Bruno viu e aprovou; ligado. Ler em 24/11.
   - 25/11 (monitor automático): leitura manual necessária — a régua (contas criadas de 14/11 15h a 21/11, 1 aula em 72 h entre as que entraram) vem do banco do app, que o leitor do dash não cobre. Nova data ~02/12.
2. Tela de conquista: LIGADA 15/11; parabéns por WhatsApp quando ele voltar (Arquiteto).
3. "Versión suave" (ver acima): Subidor transcrevendo os módulos 17, 40 e 61 (confirmou 15/11) → ler aula por aula → lista ao Bruno.
4. Aviso nos dias pesados da Calistenia (fase 2 do Tu cuidado): ler as 28 aulas uma a uma.
   Já se sabe (chat da CL-KR, 14/11): as aulas 11, 16, 17, 22 e 23 têm salto.
5. Consertos (15/11):
   - FEITO: idioma real da fala no YouTube (12bf606). Só a Calistenia (1) é espanhol; Pilates (2, os 28), Yoga en la Silla (4)
     e Cuerpo Sexy (5) são INGLÊS; Yoga Facial (3) é só música. Selo agora diz "audio en inglés". DECIDIDO 16/11 (Bruno): dublar
     2/4/5 (es+pl). Pedido ao Subidor (2 → 4 → 5; mesma aula do YouTube dia a dia; acima da cota grátis = Bruno decide gasto).
   - FEITO 16/11: 23 títulos de dia da Calistenia ES trocados pelo conteúdo real (0655177; Bruno "ok"); detalhe em
     `docs/titulos-calistenia-es.md`. Saltos nos vídeos ES: só dias 25 e 27. Dias 6 e 20 = mesmo vídeo. PL/outros idiomas
     tocam os vídeos EN (outros conteúdos): mesma leitura a fazer com as transcrições EN.
   - Antes: títulos dos dias 3–4; dia 1 do Pilates em inglês; dia 20 da Calistenia ES = vídeo do dia 6 (Subidor).
