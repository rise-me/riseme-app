# Handoff — alunas que compram pela Stripe (teste CL-PL T3, 3 dias)

> De: chat da pasta `~` (sessão brunobarros-b7), 09/11/2026. Para: chat **[Alunas Stripe]** (pasta riseme).
> Pedido do Bruno (09/11): "a ideia é rodar os 3 dias e analisar as métricas… se nesses 3 dias a gente já tiver
> ROI, eu pauso as campanhas e rodo o negócio tudo certinho". Ele abriu este chat pra parte do app.
> L4: confirme com o Bruno em uma linha antes de executar. Commit/push/deploy só com o ok dele.

## O que é o teste
CL-PL (calistenia em polonês) parou em 08/10 por falta de BLIK. A LLC abriu conta na Stripe, que tem BLIK.
Teste de 3 dias: o botão do funil `kalistenika.riseme.fitness` troca o checkout da Perfect Pay por um **link de
pagamento da Stripe** (página hospedada por ela, sem código nosso). Só o FRONT (67 zł, pagamento único).
Sem upsell em 1 clique, sem assinatura, sem Stripe Tax. Versão completa só se o teste der ROI
(`docs/stripe-checkout-plano.md`).

## O que este chat precisa entregar
**Uma rota de webhook da Stripe no app que faz pela compradora da Stripe o mesmo que
`app/api/perfectpay/route.ts` faz pela da Perfect Pay:** cria a conta (ou acha), libera o desafio no locale `pl`,
manda o acesso por WhatsApp e e-mail, registra a compra (`registrarCompra`, `registrarCompraNaConta`).
Nada de lógica nova de entrega: reaproveitar o caminho que já roda.

- Rota sugerida: `app/api/stripe/route.ts`.
- **Assinatura:** validar `Stripe-Signature` com `STRIPE_WEBHOOK_SECRET` sobre o corpo CRU (`await request.text()`),
  nunca `request.json()` antes. Exemplo oficial: stripe-node `examples/webhook-signing/nextjs/app/api/webhooks/route.ts`.
  O pacote `stripe` NÃO está no package.json (as colunas `stripe_*` do banco são nome legado com código da Hotmart).
- **Evento que entrega:** `checkout.session.completed` com `payment_status === 'paid'` (BLIK e cartão confirmam na hora).
  Por garantia tratar também `checkout.session.async_payment_succeeded`.
- **Idempotência:** a Stripe reenvia e pode mandar 2× ao mesmo tempo. Chave da venda: `st:<session.id>`
  (o `registrarCompra` já ignora duplicada pelo `stripe_payment_id`).
- **Campos da sessão:** `customer_details.email`, `.name` (pode vir vazio no BLIK), `.phone` (o link pede telefone),
  `.address.country`; `id` (cs_…), `payment_intent` (pi_…), `amount_total` (6700 = 67,00 zł), `currency` (`pln`),
  `payment_link` (plink_…), `metadata.oferta` = `CL-PL`, `metadata.papel` = `front`,
  `client_reference_id` (rastreio do funil; o app só guarda, quem lê é o dash).
- **Mapa produto → desafio:** mesmo desenho do `PERFECTPAY_CHALLENGE_MAP` (`código:challengeId:locale`).
  Sugestão: `STRIPE_CHALLENGE_MAP="<plink ou price>:<challengeId>:pl"`. Produto não mapeado = loga alto e não cria
  conta fantasma (padrão do bug Viviana). Se preferir ler de `metadata` do link, me avise que eu gravo lá.
- **Reembolso/disputa:** seguir a regra de 09/11 do app (reembolso não revoga; chargeback/disputa revoga):
  `charge.refunded` só registra; `charge.dispute.created` passa pelo `deveRevogar`.
- **Fora do escopo:** mandar venda pro dash (a Stripe manda direto pro dash por outro endpoint, como a Hotmart),
  recuperação de checkout abandonado, upsell, assinatura, nota fiscal.

## O que já existe na Stripe (SANDBOX, conta "Área restrita de RiseMe & CO LLC", acct_1UYCXFI5QcUy3fPz)
| Peça | Id |
|---|---|
| Produto "Wyzwanie Kalisteniki RiseMe™" | `prod_Vb92HUEcct5aaO` |
| Preço 67,00 PLN, imposto incluído | `price_1UZwkpI5QcUy3fPzJBU4A7lJ` |
| Link de pagamento (pede telefone, cria Customer, volta pra `/dziekujemy/?session_id=…`) | `plink_1UZwkxI5QcUy3fPz2GXY9IZG` |
| URL de teste | https://buy.stripe.com/test_dRm7sLcIe0Xv0PS6BJcQU00?locale=pl |

Meios ligados no sandbox: BLIK, cartão, Link, Apple Pay. P24 fora (não disponível na conta; fica pra versão completa).
Em produção os ids mudam: produto, preço e link são recriados quando a conta for verificada (eu aviso os novos).

## Chaves (nunca pelo chat)
- `STRIPE_WEBHOOK_SECRET` (whsec_…): nasce quando o Bruno cria o endpoint em Stripe → Desenvolvedores → Webhooks
  apontando pra `https://riseme.app/api/stripe` com os eventos acima. Ele grava na Vercel (Production, Sensitive).
- `STRIPE_SECRET_KEY`: só se a rota precisar buscar a sessão/itens na API. Preferir chave RESTRITA (só leitura de Checkout).
- As `STRIPE_*` que estão no `.env.local` são sobra de abril, de outro contexto: não usar.

## Como provar (sandbox)
1. `stripe listen --forward-to localhost:3000/api/stripe` (ou endpoint de sandbox apontando pra um preview).
2. Abrir a URL de teste, pagar com cartão `4242 4242 4242 4242` e depois com BLIK (no sandbox qualquer código de 6 dígitos).
3. Conferir: conta criada com locale `pl`, desafio liberado, compra registrada 1× mesmo reenviando o evento,
   mensagem de acesso em polonês. Usar e-mail/telefone de teste do Bruno, não de aluna.

## Quem faz o resto (não é deste chat)
- **dashboard-lucro:** ler a venda da Stripe com o anúncio (`~/Ferramentas/dashboard-lucro/HANDOFF-STRIPE-CL-PL.md`).
- **Funil CL-PL (chat da pasta `~`):** trocar o botão, InitiateCheckout no clique, Purchase na página de obrigado
  (a página da Stripe não dispara o pixel), checklist L0.
- **Bruno:** verificar a conta Stripe (sem isso não recebe pagamento real), criar o endpoint do webhook, gravar as chaves.

## Acertado com o [Alunas Stripe] em 09/11 (lado da Stripe)
- **Telefone:** obrigatório no link (`phone_number_collection.enabled`; a doc diz "required phone number field"). E.164 garantido,
  menos em Apple Pay/Google Pay: manter `toE164` com o país como rede.
- **Descritor de extrato:** `RISEME` no nível da CONTA (Bruno, em produção: Configurações → Dados da empresa). Não vai no link:
  BLIK usa o estático da conta, cartão usa o prefixo, e `statement_descriptor` no link quebra cartão. Sandbox hoje: `BIO.RISEME.FITNESS`.
- **Eventos do endpoint do app (lista final, 7):** `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
  `charge.refunded`, `charge.dispute.created`, `radar.early_fraud_warning.created` (só cartão), `refund.updated`, `refund.failed`.
  `refund.updated`/`refund.failed` dizem se o reembolso de BLIK saiu de fato: a aluna só ouve "devolvido" depois da confirmação; se falhar, o Bruno é avisado.
  **Regra do Bruno (09/11, objetivo = zero chargeback):** aviso antecipado de fraude → o app devolve sozinho e ela mantém o acesso
  (vale na fase de teste; revisar quando a conta estiver madura). Fora isso, reembolso só quando ela pede, sem atrito nenhum, e
  "como pedir reembolso" fica explícito na mensagem de acesso, no e-mail e na página de obrigado.
- **Reembolso de BLIK:** assíncrono, até 120 min, não cancela; disputa sem taxa e sem recurso, 12 dias pra responder.
- **Chave restrita:** leitura de Checkout Sessions + escrita de Refunds (o reembolso na hora pelo bot é regra do Bruno de 09/11, seção 4b do plano).

## PRODUÇÃO (09/11/2026 ~16h40, conta RiseMe & CO LLC `acct_1UYQl3I94hLYZ84h`)
- Bruno ativou o modo de produção e copiou do sandbox. Conferido no painel: produto "Wyzwanie Kalisteniki RiseMe™" ativo (67,00 PLN).
- **Link de pagamento de produção:** `plink_1UZyOgI94hLYZ84h2otvdhNd` → https://buy.stripe.com/4gM9ATfV4dNI2aRbhl6sw00
  (acrescentar `?locale=pl` + `client_reference_id=` no funil). Vieram na cópia: telefone obrigatório, volta pra
  `/dziekujemy/?session_id={CHECKOUT_SESSION_ID}`, metadados `oferta=CL-PL`, `papel=front`, `teste=CL-PL T3`, sem imposto automático.
- Meios ativos no link de produção: Cartão, Apple Pay, Link, **BLIK**.
- Conta "em análise" pela Stripe (aviso do painel: 2 a 3 dias); documento do EIN (carta 147C) enviado. Não vender antes de a análise fechar.
