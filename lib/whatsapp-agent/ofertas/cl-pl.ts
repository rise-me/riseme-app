// Ficha da oferta CL-PL (Polônia). Na Stripe desde 09/11/2026; upsell desde 13/11.
// Os textos `acesso` e `dinheiro` são o que o bot LÊ sobre esta oferta (vieram de conhecimento.ts sem mudar uma letra).
import type { FichaOferta } from './tipos'

export const ficha: FichaOferta = {
  sigla: 'CL-PL',
  pais: 'Polônia',
  idioma: 'pl',
  preco: '67 zł (upsell Protokół 97 zł, downsell 47 zł)',
  pagamento: 'Stripe: BLIK ou cartão',
  noCartao: {
    'CL-PL': 'Kalistenika (desafio)',
    'CL-PL-UP1': 'Protokół Metaboliczny 28 Dni (upsell, 97 zł)',
    'CL-PL-DS1': 'Protokół Metaboliczny 28 Dni (downsell, 47 zł)',
  },
  ddis: ['48'],
  sinais: /[ąćęłńśźż]|\bz[łl]\b|\bblik\b|zwrot|kalistenik|protok[oó][łl]/i,
  junto: [],
  acesso: ` POLONÊS DESDE 09/11/2026: a compra de 67 zł paga
  com BLIK (ou cartão) é da STRIPE (link de pagamento), NÃO da Hotmart nem da Perfect Pay: nunca diga a ela que "não aparece
  na Hotmart" nem cite Perfect Pay. Sem conta e com pagamento de 67 zł/BLIK → diga que o pagamento está confirmado do lado
  dela, que o acesso chega aqui no WhatsApp e no e-mail, peça o e-mail da compra, o telefone usado no pagamento e o comprovante se ainda não mandou, e
  transfira com AÇÃO "conferir a venda na Stripe e liberar o acesso" (o pagamento é real; não fale em golpe nem em erro dela).
  UPSELL POLONÊS NA STRIPE (desde 13/11/2026): depois de pagar o desafio (67 zł, ou 97 zł no teste de preço), ela vê a
  oferta do "Protokół Metaboliczny 28 Dni" (97 zł, com o bônus "Protokół Energii i Witalności"; se recusar, a mesma oferta
  sai por 47 zł, sem o bônus). É um PAGAMENTO SEPARADO que ELA fez (novo BLIK ou cartão), não cobrança em dobro: no extrato
  aparecem 2 cobranças RISEME. No cartão, compras desde 13/11/2026 aparecem como "RISEME* KALISTENIKA" (o desafio) e "RISEME* PROTOKOL" (o Protokół); antes disso, ou no BLIK (cada banco mostra do seu jeito), pode aparecer só "RISEME". Se ela estranhar 2 cobranças, explique isso com calma e diga o que cada uma liberou; no
  cartão as compras da Stripe mostram o nome do produto ("Kalistenika (desafio)" ou "Protokół Metaboliczny 28 Dni"; ofertas CL-PL / CL-PL-UP1 / CL-PL-DS1) e o valor (97 zł pode ser o desafio no teste de preço OU o
  Protokół: olhe o produto/oferta, não só o valor). O Protokół entra no app como produto próprio, na mesma conta, na aba "Dodatki" (não chega mensagem nova de acesso: ela entra com o mesmo login do desafio). Se ela
  não quis o Protokół e pede de volta → regra COMPRA DA STRIPE (só aquele pagamento).`,
  dinheiro: `- STRIPE (CL-PL): o meio de pagamento e o reembolso de cada compra estão no CARTÃO DA ALUNA ("Pagamentos na Stripe"): use o
  fato, nunca pergunte "BLIK ou cartão?". Prazo do reembolso concluído: BLIK = de 1 a 3 dias úteis (volta como crédito na
  conta bancária ligada ao BLIK, não como "przelew na telefon"); cartão = 5 a 10 dias úteis. NUNCA diga "2 horas" para o
  BLIK: nos 3 reembolsos BLIK acompanhados em novembro/2026 a Stripe concluiu na hora e o banco só creditou no 3º dia (as
  3 alunas reclamaram depois de ouvir "2 horas" e as 3 receberam). Se ela diz que o reembolso BLIK não entrou: dê a data e
  a REFERÊNCIA do banco que está no cartão e diga, com calma, que o banco costuma creditar até o 3º dia útil. Só depois de
  3 dias úteis sem o crédito: peça que confira no extrato/app do banco com a referência e transfira para a equipe (ação:
  abrir investigação na Stripe). Caso 16/11/2026 (aluna PL): o bot perguntou o meio e deu prazo de cartão a quem pagou com BLIK.
`,
}
