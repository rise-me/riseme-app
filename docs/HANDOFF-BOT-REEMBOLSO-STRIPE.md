# Handoff: adendo do bot para alunas que compraram pela Stripe (09/11/2026)

> De: chat [Alunas Stripe] (pasta riseme). Para: o chat dono do bot do WhatsApp (suporte).
> L4: confirme com o Bruno em uma linha antes de executar. Commit, push e deploy só com o ok dele.

## Pedido do Bruno (09/11)
- As regras e os fluxos do bot **não mudam**. Eles foram desenvolvidos no chat do suporte.
- Entra só um **adendo exclusivo para alunas da Stripe**: o reembolso delas é facilitado.
- Quem mexe no bot é **o chat dono do bot**, para que dois chats não mexam na mesma coisa. O [Alunas Stripe] não toca
  em `lib/whatsapp-agent/`.

## Por quê
O CL-PL vai vender pela Stripe (teste de 3 dias com BLIK, link de pagamento, 67 zł). Para o Bruno, chargeback na
Stripe é "extremamente perigoso": a conta pode ser fechada e o saldo ficar preso. O objetivo é zero chargeback: nenhuma
aluna pode chegar ao banco antes de conseguir o reembolso com a gente.

## O adendo (só quando a compra é da Stripe)
Quando a aluna pede reembolso de uma compra com `plataforma: 'stripe'`:
1. **Não fazer** o que vale para Hotmart/Perfect Pay: nada de perguntar o motivo, oferecer o Pase no lugar ou pôr na
   lista das 20h para o Bruno aprovar.
2. Pedir o reembolso na hora, chamando `reembolsarStripe()` (em `lib/stripe-api.ts`, feito pelo [Alunas Stripe]).
3. Responder na hora, no idioma dela (pl), mais ou menos: "Seu reembolso está sendo processado. Todas as informações
   estão nesta página: <link>". O link é da página explicativa em polonês, feita pelo [Alunas Stripe].
4. Não dizer "devolvido". A confirmação final sai pelo webhook (`refund.updated` com sucesso), também feito pelo
   [Alunas Stripe]. No BLIK leva até 2 h e pode falhar.
5. **Acesso:** segue a regra de 09/11. O bot não toca no assunto; a mensagem final do reembolso diz que o acesso fica.

Fora do pedido dela, o bot não oferece nem sugere reembolso.

## Como saber que a compra é da Stripe
O webhook da Stripe grava a compra no cartão da aluna (`registrarCompraNaConta`, `user_metadata.compras`) com
`plataforma: 'stripe'` e `transacao` = id do PaymentIntent (`pi_…`). O cartão da aluna já entra em toda resposta do bot.

## O que o [Alunas Stripe] entrega (não é do bot)
- Rota do webhook (`app/api/stripe`), entrega do acesso por WhatsApp e e-mail com conferência, aviso ao Bruno se falhar.
- `lib/stripe-api.ts` com `reembolsarStripe({ paymentIntent, motivo })`.
- Devolução automática no aviso antecipado de fraude (`radar.early_fraud_warning.created`, só cartão), na fase de teste.
- Mensagem final do reembolso confirmado ou falho, e aviso ao Bruno quando falhar.
- Página explicativa em polonês e o caminho de reembolso dentro do app.

## Status
- Nada disso está no ar ainda: o [Alunas Stripe] espera o ok do Bruno para começar.
- O adendo do bot só faz sentido depois de `reembolsarStripe()` existir. O [Alunas Stripe] avisa quando estiver pronto.
- Plano e regras: `docs/stripe-checkout-plano.md` §4b. Handoff do webhook: `docs/HANDOFF-STRIPE-ALUNAS.md`.
