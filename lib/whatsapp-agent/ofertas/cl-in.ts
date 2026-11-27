// Ficha da oferta CL-IN (Índia (inglês)). No bot desde 25/11/2026. O prazo de reembolso (dinheiro) é o mesmo texto da CL-HI: sai uma vez só no prompt.
// Os textos `acesso` e `dinheiro` são o que o bot LÊ sobre esta oferta (vieram de conhecimento.ts sem mudar uma letra).
import type { FichaOferta } from './tipos'

export const ficha: FichaOferta = {
  sigla: 'CL-IN',
  pais: 'Índia (inglês)',
  idioma: 'en',
  preco: '₹499',
  pagamento: 'Stripe: UPI ou cartão',
  noCartao: {
    'CL-IN': 'The RiseMe Calisthenics Challenge (Índia, ₹499)',
  },
  ddis: ['91'],
  sinais: /₹|\brupees?\b|\bupi\b|google ?pay|\bgpay\b|phonepe|paytm/i,
  junto: [],
  acesso: `
  ÍNDIA (oferta CL-IN, número +91, atendimento em INGLÊS simples; no cartão a compra aparece como oferta CL-IN): o produto é
  "The RiseMe Calisthenics Challenge (28 days)", ₹499, pagamento ÚNICO, sem assinatura, aulas em inglês, quem assina é a
  trainer Anjali Mehta. A compra é da STRIPE (link de pagamento), paga por UPI (Google Pay, PhonePe, Paytm ou o app do banco)
  ou por cartão: NUNCA cite Hotmart nem Perfect Pay, nunca diga que "não aparece". Sem conta e com pagamento de ₹499 → diga
  que o pagamento está do lado dela, peça o e-mail da compra e o telefone usado no pagamento (e o comprovante/UPI reference,
  se ainda não mandou) e transfira com AÇÃO "conferir a venda na Stripe e liberar o acesso" (o pagamento é real; não fale em
  golpe nem em erro dela). No extrato do UPI pode aparecer o nome legal "RiseMe & CO LLC" além de "RISEME": se ela estranhar a
  cobrança, explique que é a mesma compra. Aluna com conta em inglês (perfil "en") pode escrever em hinglish (hindi com
  inglês): entenda e responda em inglês simples e caloroso, com kg e cm, sem gíria americana. Sem conta no +91: vale a regra
  de IDIOMA do bloco ÍNDIA EM HINDI abaixo. Não ofereça convite de depoimento, Pase nem outros produtos.`,
  dinheiro: `- STRIPE (CL-IN e CL-HI, Índia): o meio está no CARTÃO DA ALUNA. Reembolso por UPI = até 7 dias úteis para aparecer na conta bancária
  ligada ao UPI (o banco credita depois de a Stripe concluir; não dá para cancelar depois de pedido). NUNCA prometa "2 horas"
  nem "instantly" (o UPI paga na hora, mas o reembolso não). Cartão indiano = depende do banco, normalmente 5 a 10 dias úteis.
  Passou de 7 dias úteis sem o crédito por UPI, ou o cartão mostra o reembolso como FALHOU → transfira (ação: devolver por
  outro meio / abrir investigação na Stripe); não peça dados bancários por conta própria.
`,
}
