# Revisão nativa do locale `nl` (CL-NL) — 11/11/2026

Revisora: subagente de contexto limpo, nativa NL/BE, adversarial. Ela recebeu os pares ES→NL das ~600 strings de
`messages/nl.json` (nos bônus, também a fonte PL) e o diff dos textos NL fora do arquivo de interface: reembolso
público e no app, e-mail de acesso, garantia, confirmação de reembolso, refeições e e-mails do Supabase.
Rubrica: gramática, cara de tradução, je/jij, plural ICU, nomes reais dos menus de iOS e Android, dias da semana,
termos de saúde, regionalismo e consistência.

## O que passou sem mudança
- Tudo em je/jij, sem nenhum "u".
- Plurais ICU certos para 1 e para 28: dag/dagen, les/lessen, training/trainingen, menu/menu's.
- Placeholders intactos.
- Nomes reais da interface: Bedieningspaneel, Scherm synchroniseren, Snelle instellingen, Scherm casten, Smart View e Gezondheid-app.
- Dias da semana Z,M,D,W,D,V,Z, começando no domingo.
- Grafias: wifinetwerk, Extra's, menu's, tv's, ’s ochtends.
- Termos de saúde: maagzuur (reflux), hoge bloeddruk, peulvruchten.
- "terugbetaling" em todo o texto (nunca "restitutie"); "challenge" em todo o texto (nunca "uitdaging").

## Aplicado (41 achados: 3 graves, 26 médios, 12 leves; aplicados os listados abaixo)
**Graves**
- Confirmação de reembolso: "via dezelfde weg als waarmee" estava errado. Agora: "via dezelfde betaalmethode die je hebt gebruikt… Hoe snel dat precies gaat, hangt af van je bank."
- Fecho do reembolso (`textoPresente('nl')`) sai em inglês até o dono do bot criar `PRESENTE.nl`. **Não aplicado aqui** porque o arquivo é do bot; vai na lista do bot.
- Assuntos dos e-mails do Supabase passam de 255 caracteres. **Não aplicado**: a decisão é do Bruno (ver relatório do bloco).

**Médios aplicados**
- "op groot formaat" → "op het grote scherm".
- "Levenslang" → "Levenslange toegang". Fora de contexto, "Levenslang" lembra pena de prisão perpétua.
- "Betaling openstaand" → "Betaling staat open".
- "Geen challenge bezig" → "Geen actieve challenge".
- "De video is niet geladen" → "De video kon niet worden geladen".
- Em holandês não se "bevestigt" um link. Agora: "klik op de bevestigingslink die we je hebben gemaild".
- "toegang"/"toegangsgegevens" (calco de "acceso") → "inloggegevens", no app e no e-mail de acesso.
- `changeNote` do e-mail reescrito: "Wil je later een eigen wachtwoord? Dat stel je in de app zelf in."
- "Start mijn 7 gratis dagen" → "Probeer 7 dagen gratis".
- "Zorg dat je ze hebt" → "Ontgrendel ze".
- "ik doe mee met RiseMe" → "ik doe mee aan de RiseMe-challenge".
- Títulos de dia sem calco:
  - série "Totale …" → "Full body kracht", "Houding van top tot teen", "Volledige mobiliteit/balans", "Complete verjonging", "Core van alle kanten", "Uithoudingsvermogen";
  - "Feest en …" → "Vieren en herstellen", "Je mijlpaal vieren", "Vieren en dankbaar zijn";
  - "Core zittend" → "Zittend je core trainen" e "Balans zittend" → "Zittend balanceren";
  - "Verbonden lichaam" → "Lichaam in balans";
  - "Premium houding" → "Perfecte houding".
- Descrições dos bônus: "je routekaart voor daarna"; protocolo "opstarten… stabiliseren", com "challenge" em minúscula no meio da frase; "echte specialisten"; tres-botoes sem repetir "aanzetten".
- "dingen … in je menu" → "voedingsmiddelen … op je menu".
- Minúscula em "gebruiksvoorwaarden"/"privacybeleid" no meio da frase de aceite.
- "Gemiddeld" → "Halfgevorderd" como nível de treino. Em custo e esforço, "Gemiddeld" fica.

**Leves aplicados**
- "United States" → "Verenigde Staten".
- "in Hotmart" → "bij Hotmart".
- Assinatura do e-mail "Hartelijke groet" → "Liefs".
- Afschrift com "(in België: rekeninguittreksel)".
- "Ademen en tot rust komen".
- "Gezondheidsklachten".
- `trialUnlockOthers` em ICU, para não sair "1 challenges".
- "tik op afspelen".

## Não aplicado (com motivo)
- Títulos dos bônus 3 e 5 ("3-dagen anti-opgeblazen-plan", "3D-platte-buikmethode"): o dono é o `CL-NL/NOMES.md`.
  O NOMES trocou os dois em 11/11 ~20h30, e o app já usa os títulos novos:
  - «Het Driedagenplan: Nooit Meer Opgeblazen»;
  - «3 verborgen schakelaars voor een platte buik» (12/11, Bruno: o título passa a ser o conteúdo do PDF; era «De 3D-methode voor een platte buik»).
- "Eindchallenge" → "De grote finale" (LEVE): ficou como está, porque "Eindchallenge" é aceitável.
- Promessa "geen robots, alleen mensen" no bônus WhatsApp-support. É fiel à fonte PL, mas o atendimento é feito por agente de IA. **Decisão do Bruno/dono da oferta.**

## Garantia
A linha da garantia no e-mail de acesso usa «IJzersterke garantie», a forma do NOMES (11/11).
