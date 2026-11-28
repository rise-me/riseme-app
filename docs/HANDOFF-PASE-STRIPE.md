# Handoff — Pase como ASSINATURA ANUAL na Stripe (só clientes Stripe: PL, IN, NL) — 28/11/2026

> De: riseme-c2 (produto do app). Para: [Alunas Stripe] (dono das vendas Stripe no app). Bruno decidiu neste chat 28/11
> ("tô de acordo"). Confirme com ele em 1 linha antes de executar (L4).

## Decidido pelo Bruno (28/11)
- Pase = **assinatura ANUAL**, valor de referência **US$ 37/ano**, cobrada em **moeda local** (PL ≈ 139 zł; IN e NL a definir pelo mesmo valor).
- **Sem período grátis**: cobra na hora da compra.
- **E-mail de aviso 7 dias antes de renovar** + **botão de cancelar dentro do app**.
- Oferta escrita deixa claro "assinatura anual, renova automaticamente". Motivo: a página de obrigado PL promete "pagamento único, sem assinatura" para o front; a renovação esquecida é o caminho da disputa.
- Só para quem compra pela Stripe. Clientes Hotmart (ES) seguem com o Pase da Hotmart.

## O que falta do lado do [Alunas Stripe]
1. Produto + preço recorrente anual na Stripe (zł primeiro) + link (Payment Link ou Checkout Session com `mode=subscription`).
2. Webhook do app: `checkout.session.completed` (assinatura) libera o Pase; `invoice.paid` renova; `customer.subscription.deleted` / falha de cobrança = acesso até o fim do período pago; reembolso e disputa como hoje.
3. Cancelamento pelo app (portal da Stripe ou endpoint próprio).
4. E-mail de aviso 7 dias antes da renovação (a Stripe tem "upcoming renewal" em Billing → Settings, ou fazer pelo nosso e-mail).
5. Dash (dashboard-lucro) passa a ler a venda de assinatura (avisar o dono).

## O que o riseme-c2 faz
- A oferta dentro do app (onde aparece, texto, prévia da tela inteira com o antes ao lado → ok do Bruno) e a medição: viu → clicou → assinou, por idioma.
- Critério (MAPA-TESTES, aprovado 28/11): em 30 dias ≥ 2% das alunas Stripe ativas assinam, reembolso ≤ 5%, 0 disputa.
