# Checkout próprio na Stripe — plano v1 (2026-11-05)

> Conta: "RiseMe & CO LLC" (Stripe, sandbox `acct_1UYCXFI5QcUy3fPz`; produção depois da verificação).
> Pedido do Bruno (05/11): 1º caso = CL-PL (BLIK/P24), mas a integração nasce genérica (P1) pra abrir outros
> mercados travados por meio de pagamento local. Gerado com o planejador da Stripe (guia
> `iguide_61VhotoIZpZ4EpNCO41I5QcUy3fPz`) + doc oficial lida em 05/11. Caminho recomendado pelo planejador:
> **Checkout hospedado pela Stripe (redirect), uma venda única, webhook pra entregar e registrar.**

## 1. Decisões fechadas pela doc (não por opinião)

| Tema | O que a doc diz (05/11) | Consequência |
|---|---|---|
| BLIK | Conta com sede nos EUA pode aceitar; cliente PL; só em PLN; mínimo 2 PLN; aceita pagamento futuro (off-session) até 2.000 PLN por cobrança, com mandato autorizado no app do banco | Preço do CL-PL tem que estar em PLN. Upsell "sem redigitar" funciona, mas o banco manda um push e a cliente confirma no app (não é 100% silencioso). |
| Przelewy24 | Conta US ok; cliente PL; EUR ou PLN; **sem pagamento futuro** (setup_future_usage ✗); sem disputa/chargeback; exige no site: endereço, NIF, nº de registro, política de reembolso, privacidade, termos | Quem paga com P24 **não tem upsell em 1 clique**: o upsell abre um Checkout novo. O funil precisa de rodapé com os dados da LLC. |
| Managed Payments (Stripe como vendedor oficial, resolve IVA/fraude/disputa por +3,5%) | EUA elegível, curso online elegível, **mas BLIK ✗ e P24 ✗** | Descartado pra Polônia. Fica como opção pra mercado só-cartão no futuro. |
| Stripe Tax (IVA) | Empresa fora da UE deve cobrar IVA desde a **1ª venda** a consumidor da UE. Registro = OSS não-União (um registro, uma declaração, qualquer país da UE). A Stripe registra por você (vale a partir do 1º dia do trimestre seguinte) ou Taxually/direto (vale desde a 1ª venda, se avisar até o dia 10 do mês seguinte) | Decisão do Bruno com o contador: registrar antes de ligar tráfego, ou aceitar o buraco até o próximo trimestre. Código fiscal do produto: escolher na lista oficial, **nunca chutar** (candidato: categoria "online courses"; conferir pelo Tax Codes API). |
| Recibo/nota | `invoice_creation.enabled` no Checkout + recibo automático ligado no painel → e-mail com PDF da nota e do recibo (cobrado à parte, não é o produto Invoicing) | Cobre "Invoicing" pro consumidor. Idioma da nota = locale do Customer. |
| Fulfillment | Entregar SÓ pelo webhook (`checkout.session.completed`), nunca pela página de obrigado; função idempotente (pode chegar 2× ao mesmo tempo) | Mesmo padrão do webhook Hotmart do app. |
| Atribuição | `metadata` do Checkout Session vai no evento `checkout.session.completed`; `payment_intent_data.metadata` copia pro PaymentIntent (eventos de refund/dispute) | Os campos de rastreio do funil (src/sck/utm por ID do anúncio) entram nos dois. **O dash é dono do formato** (L0/L4): o leitor da Stripe no dash decide os nomes. |
| Webhook no Next.js App Router | Ler o corpo cru (`req.text()`) antes de validar a assinatura; exemplo oficial stripe-node/examples/webhook-signing/nextjs | — |

## 2. Arquitetura (método, genérico)

```
funil (Cloudflare Pages, HTML/JS)            app riseme (Next.js, Vercel)                 Stripe
┌──────────────────────────┐   POST /api/stripe/checkout   ┌────────────────────────┐
│ botão "Comprar"          │ ───────────────────────────▶ │ cria Checkout Session  │ ──▶ página hospedada
│ + rastreio da página     │   {oferta, pais, rastreio}    │ (oferta → preço/moeda) │     (BLIK · P24 · cartão · Link)
└──────────────────────────┘                              └────────────────────────┘
                                                                     ▲                       │ webhook
   obrigado?session_id=…  ◀──── success_url ──────────────────────── │                       ▼
   up1 (1 clique) ──▶ POST /api/stripe/upsell ──▶ PaymentIntent off_session (cartão/BLIK) ou Checkout novo (P24)
                                                          │
                                   /api/stripe/webhook ◀──┘  checkout.session.completed · payment_intent.succeeded/failed
                                        │                    charge.refunded · refund.updated · charge.dispute.created
                                        ├─▶ entrega no app (user_challenges, mesmo caminho do webhook Hotmart)
                                        └─▶ dash (formato do dash; venda por pessoa: preencheu → tentou → pagou)
```

**O que é método (um só, pra todas as ofertas):**
- `lib/stripe/catalogo.ts`: lê um **arquivo de contexto por oferta/país** (ver §3) e devolve `price` + moeda + produto do app + URLs.
- `app/api/stripe/checkout/route.ts`: cria a Session: `mode: payment`, `currency` da oferta, `customer_creation: always`,
  `payment_intent_data.setup_future_usage: off_session` (habilita upsell em 1 clique onde o meio permite),
  `invoice_creation.enabled: true`, `automatic_tax.enabled: true`, `metadata` + `payment_intent_data.metadata` = rastreio,
  `client_reference_id` = id da sessão do funil (sck), `success_url` com `{CHECKOUT_SESSION_ID}`, `locale` da oferta.
  Meios de pagamento: **não listar à mão**; ligar no painel (Dynamic Payment Methods) e a Stripe mostra os do país.
- `app/api/stripe/upsell/route.ts`: pega Customer + PaymentMethod salvo da Session; se o meio aceita off-session
  (cartão, BLIK) cria PaymentIntent `off_session: true, confirm: true` com `metadata` herdado; senão (P24) devolve a URL
  de um Checkout novo pré-preenchido. Resultado final SEMPRE pelo webhook (`payment_intent.succeeded`), BLIK demora até ~60 s.
- `app/api/stripe/webhook/route.ts`: valida assinatura (corpo cru), idempotência por `event.id`, roteia por tipo;
  reaproveita `lib/compras.ts` e o caminho de entrega do webhook Hotmart (produto do app vem do catálogo, não hardcoded).
- Dash: parser Stripe no **dashboard-lucro** (dono), com o mesmo teste de rastreio único do lançador (L0).

**O que é caso (arquivo de contexto, fora do código):** sigla da oferta, país, moeda, preço do front/upsell/downsell,
ids de `price` da Stripe (sandbox e live), produto do app (`HOTMART_CHALLENGE_MAP` equivalente), locale, URLs do funil
(obrigado, up1, ds1), código fiscal do produto, descritor de extrato.

## 3. Caso CL-PL (primeira instância)

- Moeda **PLN** (BLIK exige). Preço: o Bruno define (hoje ~79–99 PLN na Perfect Pay). Tax: preço com IVA **incluído**
  (`tax_behavior: inclusive`) pra não mudar o valor da VSL; a Stripe desconta o IVA polonês (23%) por dentro.
- Meios: BLIK + P24 + cartão + Link. Apple/Google Pay vêm junto no Checkout hospedado.
- Upsell/downsell: 1 clique pra cartão e BLIK; P24 cai no Checkout novo (medir quantos % pagam com P24 pra saber o custo disso).
- Funil CL-PL: botão troca o link da Perfect Pay por `POST /api/stripe/checkout`; rodapé com dados da LLC (exigência P24);
  página de obrigado lê `session_id` só pra mostrar estado, nunca pra entregar.
- Teste do mapa: CL-PL T3 (régua já escrita: compradores/100 visitas ≥ 5,4; pagaram ÷ tentaram ≥ 78%; ROAS ≥ 1,8 com vencedores).

## 4. Etapas (ordem) e quem faz

1. **Bruno (painel Stripe, sandbox):** ligar BLIK, P24, cartão, Link em *Payment methods*; ligar recibo automático;
   ligar Stripe Tax e cadastrar o registro OSS não-União (ou "Register for me"); branding + dados públicos (nome legal,
   e-mail de suporte, privacidade). Gerar chave restrita pro app (só o que o app usa) e o segredo do webhook.
2. **Chaves:** `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` na Vercel (produção) e no `.env.local` (sandbox). Nunca pelo chat.
   Os `STRIPE_PRICE_*` antigos do `.env.local` são lixo de 2026-04 e saem.
3. **riseme (chat do app):** catálogo + 3 rotas + testes com `stripe listen`; compra-teste em sandbox com cartão `4242…`,
   BLIK de teste e os e-mails de simulação de falha do BLIK (`recurring_declined@`, `setup_timeout@` …).
4. **dashboard-lucro (dono do formato):** leitor Stripe (venda por pessoa, moeda PLN → BRL pelo fator da conta, reembolso e disputa).
5. **modelador-funis:** botão do CL-PL + rodapé LLC + `checklist_pagina.py` com o teste de rastreio único.
6. **Verificação da conta → live:** trocar chaves, repetir compra-teste real (BLIK de verdade, cartão polonês se der),
   `checklist` do lançador ✅ (L0) → lançador sobe o CL-PL T3.

## 4b. Regras do Bruno para a Stripe (09/11/2026): zero chargeback
Motivo, nas palavras dele: a Stripe é "extremamente restritiva" com chargeback (a conta pode ser fechada e o saldo ficar preso).
1. **Acesso sem falha:** toda compradora recebe o acesso pelo WhatsApp E pelo e-mail. Um envio que falhar é retentado e,
   se continuar falhando, o Bruno é avisado. Isso exige pedir o telefone no Checkout.
2. **Reembolso sem atrito, SÓ quando a aluna pede** (Bruno 09/11: "não é para sair distribuindo reembolso"). Os dois
   caminhos:
   - Ela escreve "quero reembolso" no WhatsApp: o reembolso é pedido na Stripe e o bot responde na hora "seu reembolso
     está sendo processado, todas as informações estão nesta página" + link de uma página em polonês com prazos e passos.
   - Ela pede dentro do app: vai para o caminho mais simples possível.

   Não há pergunta de motivo, oferta do Pase nem espera pela lista das 20h. As regras da Hotmart/Perfect Pay não valem
   aqui. **Fora o pedido dela, só há UMA devolução por iniciativa nossa:** o aviso antecipado de fraude
   (`radar.early_fraud_warning.created`, só cartão). Ele chega quando ela marca "não reconheço esta compra" na fatura,
   e aí o app devolve sozinho e ela mantém o acesso. Decisão do Bruno em 09/11, válida **na fase de teste**; revisar
   quando a conta estiver madura. Fora isso, nada de distribuir reembolso.
3. Fatos da doc, trazidos pelo chat da pasta `~` em 09/11:
   - **Reembolso de BLIK é assíncrono:** leva até 120 min e não pode ser cancelado depois de pedido. O resultado vem em
     `refund.updated`/`refund.failed`. A aluna só ouve "devolvido" quando a Stripe confirmar. Se falhar, o valor volta
     pro saldo e o Bruno é avisado para devolver por outro meio.
   - **Disputa de BLIK** não tem taxa, mas também não tem recurso, e o prazo de resposta é de 12 dias.
   - **Descritor "RISEME"** fica no nível da CONTA (o BLIK usa o descritor estático), nunca no link.
   - **Telefone:** é obrigatório no link, mas vem fora de E.164 quando ela paga com Apple Pay/Google Pay. Por isso
     passa pelo `toE164` com o país de `address.country`.

## 5. Para o Bruno decidir (uma linha cada)

- IVA: registrar OSS **antes** da 1ª venda (Taxually/direto) ou aceitar começar no trimestre seguinte (Stripe registra)? Falar com o contador da LLC.
- Preço em PLN com IVA incluído (VSL fala o preço cheio) ou IVA por fora (preço sobe 23% no checkout)?
- Upsell pra quem pagou com P24: Checkout novo (padrão) ou tirar o P24 e ficar só BLIK + cartão?
- Site da conta Stripe: `bio.riseme.fitness` foi informado; o checkout vive no funil CL-PL. Qual domínio leva os dados da LLC e as políticas?

## Estado e pendências (atualizado 09/11/2026 à noite) — a lista viva da Stripe

**O que já existe**
- Conta de produção `acct_1UYQl3I94hLYZ84h` (RiseMe & CO LLC, Wyoming), EM ANÁLISE pela Stripe (painel: 2 a 3 dias; carta 147C do EIN enviada).
- Produto `prod_Vb92HUEcct5aaO` (67,00 PLN, imposto incluído) e link de pagamento `plink_1UZyOgI94hLYZ84h2otvdhNd`
  → https://buy.stripe.com/4gM9ATfV4dNI2aRbhl6sw00 (BLIK, cartão, Apple Pay, Link; telefone obrigatório; volta pra `/dziekujemy/`).
- Visual do checkout: ícone = logo RiseMe, topo preto, botão verde `#16A34A`, imagem do produto no estilo do logo (sem a expert).
  Arquivos em `~/Empresa/RiseMe & CO LLC/marca/`.
- Site institucional no ar: https://www.riseme.co (código em `~/Produtos/Apps/riseme-site`). Documentos da LLC em `~/Empresa/RiseMe & CO LLC/`.
- Sandbox `acct_1UYCXFI5QcUy3fPz` com os mesmos produto e link de teste, pros chats testarem.

**Pendências do Bruno**
- [x] Análise da Stripe FECHADA em 09/11 ~19h30 (API: `requirements` vazio, `charges_enabled` e `payouts_enabled` true, BLIK/cartão/Link/Apple Pay ativos). Bruno fez a verificação de identidade pelo Stripe Verified.
- [ ] CONTA BANCÁRIA DE REPASSE: nenhuma cadastrada (`external_accounts` vazio); é a única exigência aberta na conta (`past_due: external_account`), SEM prazo e SEM bloqueio (API 10/11: `current_deadline` null, `disabled_reason` null; cobrança e repasse habilitados). O saldo só acumula (US$ 657,79 em 10/11 16h). Bruno 10/11: vai abrir conta pra LLC (Mercury × Payoneer comparados; decisão dele) e cadastrar no mesmo dia em que sair.
- [ ] PAYONEER DA LLC (10/11 ~17h30, conta nova, login admriseme.llc@gmail.com, celular 1328): cadastro + questionário + documentos ENVIADOS e conta "em verificação" (Payoneer: "alguns minutos"; costuma ser 1–3 dias úteis). Preenchido: LLC Wyoming (Filing ID 2026-002122259, EIN pelo Bruno), setor "Educação esportiva", clientes diretos, 0–20 transações/mês, US$ 10–50 mil/mês, Europa; endereço registrado Sheridan (agente) + sede Doral; Bruno = dono 100%, diretor, representante (assinado por ele); docs: Articles (identidade + endereço), carta EIN (NIF), CNH (dados). Conta de saque em reais: etapa passada pelo Bruno (conferir no painel qual ficou: BBS CO Empreendimentos Digitais Ltda, ag. 3104 Santander, ou pessoal). Motivo: o Mercury (pela Lá Fora) exige PASSAPORTE de não residente e o Bruno não tem → Payoneer agora, Mercury quando o passaporte sair (Bruno vai tirar na PF).
  PRÓXIMO: quando aprovar → Payoneer "Receber" → conta de recebimento em USD (routing + account, em nome da RISEME & CO LLC) → Stripe "Ver tarefa" → cadastrar conta bancária (Bruno digita) → aviso amarelo some; repasse segue MANUAL.
- [x] 10/11: telefone da CONTA verificado por SMS (final 1328, o que o Bruno atende; Configurações → Dados da conta → "Verificado"). O `support_phone` (final 2759) é o do suporte às alunas e fica. O telefone do representante (Bruno) já constava. `company.phone` segue vazio: opcional, só dentro de "Alterar dados da empresa".
- [x] 10/11: cronograma de repasse trocado de DIÁRIO pra MANUAL (Bruno: "deixa manual mesmo"; API: `interval: manual`, `delay_days: 2`). O Bruno pede o repasse quando quiser, no botão 'Fazer um repasse' da página inicial. Não tira o aviso amarelo: ele só some com a conta bancária.
- [x] Site da conta trocado de Instagram pra https://www.riseme.co; `support_email` preenchido (09/11).
- [x] Dados públicos da conta (09/11 ~22h, pelo painel): extrato `RISEME`, site https://www.riseme.co, nome público "RiseMe", e-mail contact.riseme@gmail.com, URLs de atendimento (/refund/), privacidade e termos.
- [x] E-mail de suporte: `contact.riseme@gmail.com` (já era público na página de obrigado do CL-PL); no site institucional e nos dados públicos da Stripe (09/11).
- [ ] Reconectar o conector Stripe (`/mcp`) escolhendo a conta de PRODUÇÃO (hoje o chat só vê o sandbox).
- [ ] Dar o ok ao plano no chat [Alunas Stripe].
- [ ] Apontar um chat do dashboard pro `dashboard-lucro/HANDOFF-STRIPE-CL-PL.md`.
- [ ] Quando a rota do app existir: criar o endpoint do webhook (7 eventos, lista no handoff do app) e a chave restrita
      (leitura de Checkout Sessions + escrita de Refunds) e gravar na Vercel. Nunca pelo chat.
- [ ] Conferir a conta bancária de repasse na Stripe.
- [ ] Conferir se `riseme.co` (raiz) já redireciona pra `www` (encaminhamento salvo no GoDaddy em 09/11, propagando).
- [ ] Termos e privacidade do site são rascunho do Claude: revisar quando der.
- [ ] À parte: `quiz.riseme.co` está com certificado vencido na Vercel.

**Pendências dos chats**
- [x] [Alunas Stripe] (app): rota `https://riseme.app/api/stripe` NO AR, webhook de 7 eventos em produção, página https://riseme.app/pl/refund no ar. Chave restrita e `STRIPE_CHALLENGE_MAP` só se provam na compra-teste.
- [x] dashboard-lucro: leitor NO AR em produção (09/11), formato A (`client_reference_id`), líquido pela `balance_transaction`.
- [x] Funil CL-PL NO AR com a Stripe (09/11 ~21h): botão → link de produção com `locale=pl` e `client_reference_id`; IC no clique;
      Purchase na obrigado; linha de garantia com https://riseme.app/pl/refund; checklist do modelador ✅. L0 PROVADO pela 1ª venda real (10/11 00:37, BLIK, ligada ao AD05_H1.V3 no dash). Compra-teste do Bruno em 10/11 passa a servir pra testar o reembolso sem atrito.
- [ ] lancador-ads: subir o CL-PL T3 só com checklist ✅ e conta Stripe liberada. Teste = 3 dias (critério em `CL-PL/TESTES.md`).

**Só se o teste der ROI (versão completa, seções 1 a 5 deste plano)**
- [ ] IVA: registro OSS não-União (Taxually ou portal irlandês; pedido até o dia 10 do mês seguinte à 1ª venda) + Stripe Tax ligado.
- [ ] Checkout próprio na página (a Stripe só processa), ideia do Bruno de 09/11, com upsell em 1 clique.
- [ ] P24 (exige os dados da empresa e as políticas visíveis no site).
- [ ] Raiz `riseme.co` sem www: mover o DNS pra Cloudflare copiando os 17 registros do GoDaddy (a varredura automática pula 7).

## Preços do Stripe Tax (lidos no painel da conta em 05/11/2026, sandbox)
- **Tax básico (plano atual):** 0,5% por transação onde houver cadastro (Checkout/Billing/Invoicing); sem cadastro nem declaração.
- **Tax Complete, nível 1:** US$ 90/mês, contrato de 1 ano; 200 transações/mês (US$ 0,50 a mais por excedente); 2 cadastros globais/ano
  (US$ 150 por cadastro adicional + "tarifa regional" não informada pra fora dos EUA); 4 declarações/ano com parceiros
  (US$ 55 por declaração adicional + tarifa regional fora dos EUA). Níveis 2–4: 1.000 / 2.500 / 5.000 transações/mês (preço não lido).
- Leitura: o OSS não-União = 1 cadastro + 4 declarações/ano, cabe no nível 1. O nível 1 cobre ~200 vendas/mês; acima disso, US$ 0,50 por venda.
- Alternativa sem plano: cadastro direto no portal da Receita irlandesa (grátis) + declaração pelo contador com o relatório do Stripe Tax.

## Fontes (doc Stripe, lidas 05/11/2026)
docs.stripe.com/payments/blik · /payments/p24 · /payments/managed-payments/eligibility · /tax/supported-countries/european-union ·
/tax/use-stripe-to-register/outside-united-states · /tax/digital-products · /receipts · /checkout/fulfillment ·
/payments/checkout/save-during-payment · /metadata/use-cases · /events/manage-webhook-endpoints
