# Revisão adversarial do tcheco (cs) — 14/10/2026

Revisão de contexto limpo de tudo que a aluna CL-CZ vê em tcheco: app (`messages/cs.json`),
WhatsApp de acesso/apoio, e-mails (Resend + 4 modelos do Supabase) e os 9 materiais (8 bônus + Protocolo).
Comparado com `es.json`/`pl.json` e com os `pl.html`. **22 correções.** Promessas e claims não foram tocados.

## Padrão decidido (aplicar daqui pra frente)
- **Nome do produto:** `Kalistenická výzva RiseMe™` (o mesmo que o funil CL-CZ já usa).
- **Referência curta ao produto nos materiais:** `Výzva` com V maiúsculo (o Protocolo já fazia assim; os outros bônus estavam em minúscula). Em minúscula, `výzva` = qualquer desafio do app.
- **Protocolo:** `Metabolický protokol` (título) / `28denní Metabolický protokol` no texto. Fases: **Zážeh · Očista · Zrychlení · Stabilizace** — iguais no app e no PDF.
- **Voz da equipe:** feminino plural (`poslaly jsme`, `dostaly jsme`, `rády ti pomůžeme`), como no app inteiro.

## Correções

| Arquivo | Antes → Depois | Motivo |
|---|---|---|
| messages/cs.json · challenges.beginner | Začátečník → Začátečnice | Masculino; aparece no perfil dela ("Úroveň kondice") e nos treinos |
| messages/cs.json · challenges.intermediate | Středně pokročilý → Středně pokročilá | Idem (gênero) |
| messages/cs.json · challenges.advanced | Pokročilý → Pokročilá | Idem (gênero) |
| messages/cs.json · firstAccess.title | Jsi tam! 🎉 → Jsi přihlášená! 🎉 | Calco de "¡Estás dentro!"; "jsi tam" soa "você está lá" |
| messages/cs.json · bonusData.protocolo-metabolico.description | …pohání tvou výzvu. Čtyři fáze: zážeh, očista… → …pohání tvou Výzvu. Čtyři fáze: Zážeh, Očista, Zrychlení a Stabilizace. | Nomes de fase iguais ao PDF + padrão de nome do produto |
| messages/cs.json · challengeDays.2[1] | Držení těla a postavení → Držení těla a správná osa | "postavení" solto = "posição/status"; não comunica "alinhamento" |
| lib/whatsapp-access.ts · boas-vindas cs | Vítej ve výzvě RiseMe™️ – Kalistenika doma! → Vítej v Kalistenické výzvě RiseMe™️! | Nome do produto padronizado (igual ao funil) |
| supabase/email-templates/build.mjs · invite | …a rádi ti pomůžeme. → …a rády ti pomůžeme. | Equipe no feminino, como no resto |
| supabase/email-templates/build.mjs · recovery | Dostali jsme žádost… → Dostaly jsme žádost… | Idem (`invite.html` e `recovery.html` regerados) |
| materiais/depois-28-dias/cs.html | …jako ve svém novém všedním dni → …— ne jako v „dietě“, ale jako ve své nové každodennosti | Calco do polonês ("nowa codzienność"); "všední den" = "dia útil" |
| materiais/depois-28-dias/cs.html · título | Tvůj nový všední den → Tvoje nová každodennost | Idem |
| materiais/depois-28-dias/cs.html | Takhle vypadá postupně, po 28 dnech. → Takhle vypadá v průběhu času po 28 dnech. | Frase truncada/estranha |
| materiais/depois-28-dias/cs.html | zopakuj výzvu → zopakuj Výzvu | Padrão do nome do produto |
| materiais/anti-inchaco/cs.html (2×) | úkolem 28denní výzvy → úkolem 28denní Výzvy | Padrão do nome do produto |
| materiais/anti-inchaco/cs.html | připravená na výzvu → připravená na Výzvu | Idem |
| materiais/anti-inchaco/cs.html · rodapé | proměna s výzvou → proměna s Výzvou | Idem |
| materiais/anti-inchaco/cs.html · aviso legal | léky na odvodnění → močopudné léky | Termo médico correto (diurético), igual ao bônus do vinagre |
| materiais/tres-botoes/cs.html | Cviky z výzvy → Cviky z Výzvy | Padrão do nome do produto |
| materiais/rastreador-progresso/cs.html | …stejná hodina. → …i stejná denní doba. | "stejná hodina" = "a mesma hora (de 60 min)"; o sentido é "mesmo horário do dia" |
| materiais/protocolo-metabolico/cs.html · lista de compras | Sypaný nebo kvalitní sáčky. → Sypaný, nebo kvalitní porcovaný. | Concordância quebrada (adjetivo masc. + "sáčky") |
| materiais/protocolo-metabolico/cs.html · chá da Očista | přidej nasekanou petržel → přidej nasekanou petrželovou nať | Ingrediente é a salsinha (folha); "petržel" sozinho em tcheco pode ser a raiz |

## Conferido e mantido (sem erro)
- Plurais tchecos (one/few/many/other) e placeholders `{...}` de todas as chaves; chaves idênticas às do `pl.json`.
- Rótulos reais do sistema: iPhone "Sdílet" → "Přidat na plochu" → "Přidat" (≠ "Přidat do oblíbených"); Chrome Android "Instalovat aplikaci" / "Přidat na plochu" → "Instalovat"; iOS "Ovládací centrum" / "Zrcadlení obrazovky"; Android "Odeslat obrazovku"; app "Zdraví".
- Registro "ty" + feminino em todo o app, WhatsApp, e-mails e materiais; formato tcheco (`80 °C`, `60–70 %`, `2–2,5 l`, `28 dní`/`28denní`).
- Instruções de execução dos materiais (exercícios do vinagre, medidas do rastreador, receitas/horários/temperaturas dos 4 chás) batem com o polonês.

PDFs regerados (`materiais/_out/`, fora do git): depois-28-dias, anti-inchaco, tres-botoes, rastreador-progresso, protocolo-metabolico — todos sem página estourada. Falta subir com `scripts/publish-material.py` e colar `invite.html`/`recovery.html` no painel do Supabase.
