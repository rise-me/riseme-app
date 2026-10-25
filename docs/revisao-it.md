# Revisão adversarial do italiano (it) — 25/10/2026

Revisão de contexto limpo de tudo que a aluna CL-IT vê em italiano: app (`messages/it.json`), WhatsApp de acesso/apoio/recuperação/depoimentos, agente (`responder.ts`), e-mails (Resend + 4 modelos do Supabase) e os 10 materiais (8 bônus + Protocolo + guia de acesso).
Comparado com `es.json`/`cs.json` e com os `cs.html` (números, medidas e avisos de saúde conferidos por script: nenhum número divergente do original). **34 correções** (5 graves, 14 médias, 15 leves). Promessas, claims e avisos de saúde não foram tocados nem acrescentados.

## Padrão decidido (aplicar daqui pra frente)
- **Produto:** `Sfida Calisthenics RiseMe™` (nome); `Sfida` com S maiúsculo nos materiais/WhatsApp quando é "a" Sfida dela; `sfida` minúsculo = qualquer desafio genérico do app.
- **Títulos dos desafios no app:** caixa de frase italiana (`Calisthenics a casa`, `Pilates al muro`), não Title Case espanhol.
- **Aviso legal:** sempre `Avvertenza legale` (singular, igual em todos os materiais).
- **Aspas:** `«…»` em tudo (os materiais misturavam `“…”`).
- **Tè × tisane:** o Protocolo é "sistema di tè" (app e PDF iguais); "tisane" só para infusão sem chá (camomilla) e para o "niente tisane" do plano anti-inchaço.
- **Menus do sistema:** iPhone `Condividi` → `Aggiungi alla schermata Home` → `Aggiungi`; Chrome Android `Installa app` / `Aggiungi a schermata Home`; iOS `Centro di controllo` → `Mirroring schermo`; Android `Trasmetti` (Samsung `Smart View`).

## Correções

| Arquivo · chave/trecho | Antes → Depois | Por quê | Gravidade |
|---|---|---|---|
| messages/it.json · castTv.ios.step2 | «Duplica schermo» → «Mirroring schermo»; "Centro di Controllo" → "Centro di controllo" | Rótulo antigo do iOS (≤ 12) / tradução do espanhol "Duplicar pantalla"; no iOS italiano atual o botão é "Mirroring schermo" (ver decisão em aberto) | grave |
| materiais/frutas-inocentes/it.html · título da ficha 3, corpo e lista "Con moderazione" (3×) | frutta secca → frutta essiccata | "Frutta secca" em italiano = noci/mandorle; o original (sušené ovoce) é fruta desidratada (passas etc.). Mudava o sentido do alerta | grave |
| materiais/vinagre-maca/it.html · "E questo «anche mentre dormi»?" | …che va inteso il «anche mentre dormi» → …che va intesa l'espressione «anche mentre dormi» | Artigo errado diante de expressão citada ("il «anche»") | grave |
| lib/whatsapp-agent/depoimentos.ts · CONVITE_V2 (it) | (faltava o parágrafo do "Mi piace") → ❤️ E se puoi, metti anche «Mi piace» al post… | Versão italiana tinha perdido o pedido de curtir que es/pl/cs têm (CONVITE_V1) | grave |
| materiais/anti-inchaco/it.html · "La regola in una frase" | Meno prodotti con una lunga lista…, più piatta sarà → Meno prodotti mangi con una lunga lista…, più piatta sarà | Comparativo sem verbo: frase agramatical | grave |
| messages/it.json · subscription.trialDay2Title | Oggi è il tuo giorno 2 della sfida! → Oggi è il giorno 2 della tua sfida! | Calco do espanhol; ordem não natural | médio |
| messages/it.json · bonusData.protocolo-metabolico.description | sistema di tisane → sistema di tè | O PDF e o texto todo dizem "tè"; "tisane" contradiz o PDF (e o anti-inchaço diz "niente tisane") | médio |
| messages/it.json · firstAccess.title | Ci sei! 🎉 → Sei dentro! 🎉 | Calco de "¡Estás dentro!"; "Ci sei!" soa "você entendeu/está aí" | médio |
| materiais/pristup-do-aplikace/it.html · mockup do app | Ci sei! 🎉 → Sei dentro! 🎉 | Igual ao app | médio |
| lib/whatsapp-agent/responder.ts · frase de transferência (it) | al settore responsabile dei rimborsi → al reparto che si occupa dei rimborsi (e "Sto trasferendo" → "Sto passando") | "settore" é calco de "sector"; em italiano diz-se "reparto/ufficio" | médio |
| lib/whatsapp-agent/depoimentos.ts · CONVITE_V2 | «Sarà affidabile?» → «Sarà una cosa seria?» | "Affidabile" é de produto/pessoa; a dúvida da aluna é "é golpe?" | médio |
| materiais/falsos-saudaveis/it.html · ficha das barrette | una cioccolata → una barretta di cioccolato | "Cioccolata" = bebida (ou, regional, tablete); ambíguo | médio |
| materiais/anti-inchaco/it.html · almoço do dia 3 | Oggi il tuo piatto sia una festa → Fai del tuo piatto una festa | Subjuntivo exortativo rígido, traduzido | médio |
| materiais/tres-botoes/it.html · interruptor 3 | Abbassa gli schermi → Attenua gli schermi | "Abbassare gli schermi" = baixar as telas; original (ztlum) = reduzir a luz | médio |
| materiais/protocolo-metabolico/it.html · ritual noturno | Abbassa gli schermi (60 min…) → Spegni gli schermi (60 min…) | Idem (texto seguinte já diz "metti via il telefono") | médio |
| messages/it.json · menu.objetivo.gain | Aumentare la massa → Aumentare la massa muscolare | "Ganar masa" calcado; sem "muscolare" ficava ambíguo | médio |
| messages/it.json · challengeDays.1[12] | Gambe e posteriore → Gambe e femorali | "Posterior" é calco do espanhol; em italiano a região é "femorali" | médio |
| messages/it.json · challengeDays.1[17] | Glutei e posteriore → Glutei e femorali | Idem | médio |
| messages/it.json · challengeDays.4[14] | Colonna sana → Schiena sana | "Colonna" sozinha não é "coluna vertebral" no linguajar de treino | médio |
| lib/whatsapp-access.ts · SUPPORT (it) | difficoltà ad entrare → difficoltà a entrare | "ad" só diante da mesma vogal | leve |
| materiais/anti-inchaco/it.html · dia 1 | Un bicchiere di acqua tiepida → Un bicchiere d'acqua tiepida | Elisão natural | leve |
| materiais/protocolo-metabolico/it.html · hidratação | un bicchiere di acqua tiepida → un bicchiere d'acqua tiepida | Idem | leve |
| messages/it.json · home.waterDone | Obiettivo di acqua di oggi → Obiettivo di idratazione di oggi | "Obiettivo di acqua" é calco de "meta de agua" | leve |
| messages/it.json · challengeData 1–5 e workoutData w1–w3 | Calisthenics a Casa, Pilates al Muro, Yoga Facciale, Yoga sulla Sedia, Corpo Sexy d'Estate, Allenamento Express, Stretching Totale, Core Forte → caixa de frase (Calisthenics a casa, Pilates al muro…) | Title Case é do espanhol; título italiano usa só a 1ª maiúscula | leve |
| messages/it.json · menu.objetivo.maintain | Mantenere → Mantenere il peso | Verbo solto, sem objeto | leve |
| messages/it.json · menu.restrictions | Restrizioni → Restrizioni alimentari | Rótulo seco; fica claro que é dieta | leve |
| materiais/*/it.html (depois-28-dias, anti-inchaco, linha-suporte; 13 ocorrências) | “…” → «…» | Padrão único de aspas (as outras 49 já eram «») | leve |
| materiais/depois-28-dias/it.html · rodapé legal | Avvertenze legali. → Avvertenza legale. | Título do aviso igual em todos os materiais | leve |
| materiais/anti-inchaco/it.html · título e rodapé | Avvertenze legali / Avvertenze → Avvertenza legale / Avvertenza | Idem | leve |
| materiais/protocolo-metabolico/it.html · título e rodapé | Avvertenze legali → Avvertenza legale | Idem | leve |
| materiais/protocolo-metabolico/it.html · estatística | 3–8 / per cento di muscoli persi → 3–8 % / di muscoli persi | Igual às outras duas estatísticas (60–70 %, 20–30 %) | leve |
| materiais/rastreador-progresso/it.html · bem-estar | …da 1 a 10&nbsp;: → …da 1 a 10: | Espaço antes de dois-pontos é francês, não italiano | leve |
| materiais/pristup-do-aplikace/it.html · abas e rodapé (2×) | Calisthenics a Casa → Calisthenics a casa | Igual ao nome que o app mostra agora | leve |

**Contagem total: 34 problemas corrigidos.** Por gravidade: **grave 5 · médio 14 · leve 15.** (Tcheco: 22.)

## Conferido e mantido (sem erro)
- Chaves de `it.json` idênticas às de `es.json` (o it tem 4 a mais: título/descrição de `linha-suporte` e `rastreador-progresso`, que o es não tem). Placeholders `{name} {count} {n} {day} {email} {percent}…` todos presentes; ICU `one/other` correto em `days`, `streak`, `daysCompleted`, `streakDays`, `challengesAvailable`, `menu.remaining` e no plural aninhado de `trialUnlockOthers`.
- Rótulos reais: iPhone «Condividi» → «Aggiungi alla schermata Home» → «Aggiungi» (≠ «Aggiungi ai preferiti»); Chrome Android «Installa app» / «Aggiungi a schermata Home» → «Installa»; Android «Trasmetti» e Samsung «Smart View»; Gmail «Promozioni»/«Aggiornamenti»; app «Salute».
- Abas iguais em app, WhatsApp e PDFs: Home · Sfide · Menu · Extra · Altro. A barra inferior do app tem 5 abas (`BottomNav.tsx` não mostra Allenamenti); o PDF de acesso diz "cinque schede", correto.
- Registro "tu" + feminino em todo o app, WhatsApp, e-mails e materiais; "noi/il nostro team" para a equipe. Chiara Rinaldi como assinatura em todos.
- Números e medidas dos 10 materiais (°C, g, ml, min, páginas, 7–8 mil passos, 2–2,5 l, 28 dias) conferidos por script contra os `cs.html`: nenhuma diferença. Títulos das fases iguais no app e no PDF (Accensione · Depurazione · Accelerazione · Stabilizzazione). Avisos de saúde com o mesmo alcance do cs (gravidez, medicação, caféina, potássio/rins etc.).
- Assunto do e-mail no guia de acesso («Benvenuta in RiseMe! Ecco il tuo accesso 💛») igual ao de `lib/email.ts`.

## Achei mas NÃO consertei (decisão do Bruno / verificação)
1. **Rótulo do iOS "Mirroring schermo"**: troquei com base no iOS italiano atual (Centro di controllo → "Mirroring schermo"), mas sem iPhone italiano aqui para provar. Vale conferir num aparelho em italiano (se for "Mirroring dello schermo", ajustar a mesma frase).
2. **"Regalo 01–07" nos PDFs × "Extra/Bonus" no app**: o cs usa "Dárek" (presente) igual; mantive. Se quiser unificar com a aba "Extra", é troca de rótulo nas capas.
3. **`bonusData.vinagre-maca` no es.json é outra descrição** ("El Truco del Hielo… vaso con hielo") enquanto it/cs/pl descrevem "3 minutos de movimento + aceto"; o it segue o PDF (correto). O es parece desatualizado — é do chat do es, não mexi.
4. **"Trainer ed esperta"** (assinatura dos PDFs): anglicismo aceitável no fitness italiano; alternativa "Personal trainer ed esperta". Mantido.
5. **Aspas/apóstrofos do Protocolo** usam `’` tipográfico, os demais materiais `'` reto. Só estética, não mexi.
6. **`Dall'8º giorno`** (ordinal com º): aceitável; "dall'ottavo giorno" soa mais italiano, mas altera 3 textos (app, WhatsApp, página). Mantido.
7. **"Cechia"** na tela de idioma: correto (também "Repubblica Ceca"); mantido.
8. **Frase de abertura do cap. "Dopo i 28 giorni"** ("…lo riprendono, e non perché abbiano dimagrito, ma perché hanno mollato") é fiel ao tcheco, mas a lógica é estranha também no original; sugestão de redação é do copy, não da tradução.
9. **"Niente tisane" (plano anti-inchaço)** convive com o Protocolo de tè: sentido correto (refere-se a detox-drinks), mas uma leitora atenta pode estranhar. O es/cs dizem "tés/čajů" — mesma tensão no original.
