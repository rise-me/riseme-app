// Ficha da oferta CL-NL (Holanda/Bélgica). No bot desde 26/11/2026.
// Os textos `acesso` e `dinheiro` são o que o bot LÊ sobre esta oferta (vieram de conhecimento.ts sem mudar uma letra).
import type { FichaOferta } from './tipos'

export const ficha: FichaOferta = {
  sigla: 'CL-NL',
  pais: 'Holanda/Bélgica',
  idioma: 'nl',
  preco: '€ 19',
  pagamento: 'Stripe: iDEAL, Bancontact, cartão ou Apple Pay',
  noCartao: {
    'CL-NL': 'De RiseMe Calisthenics Challenge (Holanda/Bélgica, € 19)',
  },
  ddis: ['31', '32', '597', '599', '297'],
  sinais: /\bideal\b|bancontact|\b(ik heb|geld terug|inloggegevens|wachtwoord|terugbetaling|betaald)\b/i,
  junto: [],
  acesso: `
  HOLANDA/BÉLGICA (oferta CL-NL; números +31, +32, +597, +599, +297; atendimento em HOLANDÊS, tratamento je/jij, falando com
  uma mulher; no cartão a compra aparece como oferta CL-NL): o produto é "De RiseMe Calisthenics Challenge" (28 dagen); no
  app o desafio chama "Calisthenics thuis". € 19, pagamento ÚNICO, sem assinatura ("eenmalige betaling, geen abonnement"),
  btw incluído. A compra é da STRIPE (link de pagamento), paga por iDEAL, Bancontact, cartão ou Apple Pay; no extrato aparece
  "RISEME* CALISTHENICS". NUNCA cite Hotmart nem Perfect Pay, nunca diga que a compra "não aparece". Sem conta e com
  pagamento de € 19 → diga que o pagamento está do lado dela, peça o e-mail da compra e o telefone usado no pagamento (e o
  comprovante, se ainda não mandou) e transfira com AÇÃO "conferir a venda na Stripe e liberar o acesso" (o pagamento é real;
  não fale em golpe nem em erro dela). Rótulos do app em holandês, exatos: abas Home · Trainingen · Challenges · Menu ·
  Extra's · Meer; ajuda em Meer → Helpcentrum; reembolso em Meer → Terugbetaling; na tela de login, "Wachtwoord vergeten?".
  Não ofereça convite de depoimento, Pase nem outros produtos.`,
  dinheiro: `- STRIPE (CL-NL, Holanda/Bélgica): o meio está no CARTÃO DA ALUNA. Reembolso por iDEAL ou Bancontact = volta para a conta
  bancária de onde saiu, em 5 a 10 dias úteis; cartão e Apple Pay = 5 a 10 dias úteis. NUNCA prometa "na hora" nem "2 horas".
  Passou de 10 dias úteis sem o crédito → peça que confira o extrato e transfira (ação: abrir investigação na Stripe).
`,
}
