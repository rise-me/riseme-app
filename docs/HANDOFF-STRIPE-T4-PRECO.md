# Handoff — CL-PL T4 (teste de preço 67 × 97 zł na Stripe): o que o app precisa — 12/11/2026

**De:** chat do funil CL-PL. **Para:** chat do app ([Alunas Stripe] ou quem assumir `app/api/stripe`). **Antes do upsell** (ordem do Bruno 12/11).

## O fato
Criei na Stripe (conta LLC, produção) um 2º link de pagamento do FRONT da CL-PL com 97 zł:
- `plink_1Ub7OII94hLYZ84htpxWtb0c` · `price_1Ub7OBI94hLYZ84hI3q1LyKr` · produto `prod_Vb92HUEcct5aaO` (o mesmo do front de 67)
- URL `https://buy.stripe.com/cNiaEX10a10W16NfxB6sw01`
- metadata do link: `oferta=CL-PL`, `papel=front`, `teste=CL-PL T4`, `preco=97`; `payment_intent_data.metadata`: `oferta=CL-PL`, `papel=front`, `preco=97`
- volta pra `/dziekujemy/?session_id={CHECKOUT_SESSION_ID}`, telefone obrigatório, cliente sempre criado — igual ao link de 67.
- `client_reference_id` idêntico ao do link de 67 (`c<camp>_s<cj>_a<ad>_k<sck>`).

Ainda NÃO está no funil: o sorteio (25% no 97) fica desligado até o app cobrir o link, a compra-teste passar e o Bruno ligar.

## O que precisa no app
1. `STRIPE_CHALLENGE_MAP` cobrir o link novo. Como o mapa aceita a chave por `metadata.oferta`, sugestão: acrescentar `CL-PL:1:pl`
   (cobre este link e qualquer link futuro do front PL) em vez de mais um `plink_…`. Bruno grava na Vercel (Production) + redeploy.
2. Confirmar que nada mais no app depende do valor (reembolso é por payment_intent; o aviso de fraude devolve o valor real).
3. Compra-teste de 97 zł (Bruno) depois do redeploy: conta criada, WhatsApp + e-mail, venda no dash com 97 PLN, reembolso pelo app.
4. Me avisar (chat `[CL-PL] Funil e Ajustes`) quando o mapa estiver no ar.

## Fora deste pedido
O upsell de 1 clique (checkout criado pelo app com `setup_future_usage`) vem DEPOIS da leitura do T4, como teste A/B; desenho em
`stripe-checkout-plano.md` §2 e `~/Produtos/Infoprodutos/calistenia/CL-PL/PLANO-BACKEND-STRIPE.md`.
