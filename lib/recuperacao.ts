// Recuperação de compra do front da CL-ES por WhatsApp (14/10/2026, decisão do Bruno — "Grupo A": quem preencheu
// o checkout e tentou pagar, mas não concluiu). DADOS DO CASO ficam aqui: oferta, link e textos.
//
// Regras:
// - 15 min depois da tentativa (dá tempo de ela tentar de novo sozinha); se aprovar antes, a mensagem é apagada.
// - 1 recuperação por número a cada 48 h (várias tentativas seguidas viram uma mensagem só).
// - Quem já tem conta no app (já comprou) não recebe.
// - O link volta pro mesmo checkout com email/nome e o `sck` da tentativa: a venda recuperada continua atribuída
//   ao anúncio de origem no dashboard (cadeia P4).
// - Quem responde cai no bot do suporte (o outbox grava a mensagem no histórico da conversa).

// Produto e ofertas do front da CL-ES (Hotmart H101419289G = produto 6087092).
export const PRODUTO_ID = 6087092
const OFERTA_FRONT = 'j3m3v9m3'
// Oferta PRÓPRIA da recuperação (decisão do Bruno 14/10/2026): mesmo produto e preço, código diferente, para o dashboard
// separar "venda recuperada" pelo código da oferta — sem tocar em src/sck/xcod. Vazia = o link usa a oferta do front.
// Antes de preencher: a oferta nova precisa estar na página de checkout personalizada, no order bump e no Funil de Vendas.
export const OFERTA_RECUPERACAO = process.env.RECUPERACAO_OFERTA ?? ''
// Tentativas que disparam a recuperação e aprovações que a cancelam: o front e a própria oferta de recuperação.
export const OFERTAS = new Set([OFERTA_FRONT, OFERTA_RECUPERACAO].filter(Boolean))
const CHECKOUT = 'https://pay.hotmart.com/H101419289G'
// Mesmos parâmetros do atalho oficial do funil (hotm.io/checkout-calistenia-es-sem-boleto), conferido 14/10/2026.
const PARAMS_FIXOS = { off: OFERTA_RECUPERACAO || OFERTA_FRONT, checkoutMode: '10', hideBillet: '1', hideMultipleCards: '1' }

export const ESPERA_MS = 15 * 60_000
export const JANELA_MS = 48 * 3600_000

// Nome do meio de pagamento como a compradora conhece.
const MEIO: Record<string, string> = {
  CREDIT_CARD: 'tarjeta',
  APPLE_PAY: 'Apple Pay',
  GOOGLE_PAY: 'Google Pay',
  PAYPAL: 'PayPal',
  NEQUI: 'Nequi',
  BANK_TRANSFER: 'transferencia bancaria (PSE)',
  DIRECT_BANK_TRANSFER: 'transferencia bancaria',
  MERCADO_PAGO: 'Mercado Pago',
  BANCOLOMBIA: 'Bancolombia',
  YAPE: 'Yape',
  SERVIPAG: 'Servipag',
  MACH_PAY: 'MACH',
}
const CARTAO = new Set(['CREDIT_CARD', 'APPLE_PAY', 'GOOGLE_PAY', 'PAYPAL'])

export type Caso = 'cartao' | 'local' | 'pendente' | 'vencido'

export function casoDoEvento(evento: string, tipoPagamento: string | undefined): Caso | null {
  if (evento === 'PURCHASE_BILLET_PRINTED') return 'pendente'
  if (evento === 'PURCHASE_EXPIRED') return 'vencido'
  if (evento === 'PURCHASE_CANCELED') return tipoPagamento && CARTAO.has(tipoPagamento) ? 'cartao' : 'local'
  return null
}

// Os TRÊS campos de rastreio da tentativa original voltam no link (purchase.origin.{src,sck,xcod}): o dashboard lê a
// cadeia do anúncio do `src` (FB|campanha|id|…|placement, formato fixo de 6 ou 8 partes) e do `xcod`; só o `sck` não
// basta — a venda recuperada chegaria "sem anúncio" (sintoma BC-EN 08/10, regra L0). Conferido 14/10/2026 em vendas reais.
export function linkCheckout(p: { email?: string; nome?: string; sck?: string; src?: string; xcod?: string }): string {
  const u = new URL(CHECKOUT)
  for (const [k, v] of Object.entries(PARAMS_FIXOS)) u.searchParams.set(k, v)
  if (p.email) u.searchParams.set('email', p.email)
  if (p.nome) u.searchParams.set('name', p.nome)
  if (p.src) u.searchParams.set('src', p.src)
  if (p.sck) u.searchParams.set('sck', p.sck)
  if (p.xcod) u.searchParams.set('xcod', p.xcod)
  return u.toString()
}

function primeiroNome(nome?: string): string {
  const n = (nome ?? '').trim().split(/\s+/)[0] ?? ''
  return n ? n.charAt(0).toUpperCase() + n.slice(1).toLowerCase() : ''
}

const SAIR = 'Si prefieres que no te escribamos más, responde *NO* y listo.'

export function mensagem(caso: Caso, p: { nome?: string; tipoPagamento?: string; link: string }): string {
  const ola = primeiroNome(p.nome) ? `Hola, ${primeiroNome(p.nome)} 👋` : 'Hola 👋'
  const meio = MEIO[p.tipoPagamento ?? ''] ?? 'tu medio de pago'
  const produto = '*Desafío de Calistenia de 28 Días*'
  const linhas: Record<Caso, string[]> = {
    cartao: [
      ola,
      '',
      `Vimos que intentaste entrar al ${produto}, pero el pago con ${meio} no pasó. Pasa seguido: muchos bancos bloquean compras internacionales.`,
      '',
      'Puedes intentarlo de nuevo con otra tarjeta o con un medio de pago local de tu país, en el mismo checkout 👇',
      p.link,
    ],
    local: [
      ola,
      '',
      `Vimos que empezaste tu pago del ${produto} con ${meio}, pero no se completó.`,
      '',
      'Puedes intentarlo de nuevo aquí, con el mismo medio o con otro 👇',
      p.link,
    ],
    pendente: [
      ola,
      '',
      `Tu pago del ${produto} con ${meio} quedó pendiente. Si todavía no lo terminaste, complétalo en tu app o en tu banco y tu acceso llega en minutos.`,
      '',
      'Si el código venció o lo perdiste, puedes generar uno nuevo aquí 👇',
      p.link,
    ],
    vencido: [
      ola,
      '',
      `Tu pago del ${produto} con ${meio} venció antes de completarse.`,
      '',
      'Puedes generar uno nuevo aquí, con el mismo medio o con otro 👇',
      p.link,
    ],
  }
  return [...linhas[caso], '', '¿Te trabaste en algún paso? Respóndeme por aquí y te ayudo. 💛', '', SAIR].join('\n')
}
