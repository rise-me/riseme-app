// Recuperação de compra do front da CL-PL (Perfect Pay) por WhatsApp — DADOS DO CASO (14/10/2026, ok do Bruno:
// "o risco é baixo, a pessoa preencheu o próprio número"). Regras comuns em lib/recuperacao-fila.ts.
//
// Perfect Pay: sale_status_enum 12 = checkout preenchido sem pagar · 5 = recusado · 6/11/13/15 = cancelado/erro/
// vencido · 2/10 = aprovado. O rastreio volta em metadata.utm_* (a PP devolve ao dashboard), por isso o link de volta
// leva os mesmos utm_* (+ src/sck se vierem). Mensagem puxa para Apple Pay / Google Pay (Bruno: ainda sem BLIK;
// os bancos poloneses barram cartão no processador).

export const PRODUTO_PP = 'PPPBFHGM' // produto da CL-PL na Perfect Pay (CL-PL/OFERTA.md)
const CHECKOUT = 'https://go.centerpag.com/PPU38CQGNRM' // mesmo checkout do funil (CL-PL/config.js), 67 zł
const PARAMS_FIXOS = { upsell: 'true', country: 'PL' }
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'src', 'sck']

export type CasoPL = 'preenchido' | 'recusado' | 'cancelado'
export function casoDoStatus(status: number): CasoPL | null {
  if (status === 12) return 'preenchido'
  if (status === 5) return 'recusado'
  if ([6, 11, 13, 15].includes(status)) return 'cancelado'
  return null
}
export const STATUS_APROVADO = new Set([2, 10])

const MEIO: Record<string, string> = {
  credit_card: 'kartą',
  apple_pay: 'przez Apple Pay',
  google_pay: 'przez Google Pay',
  paypal: 'przez PayPal',
}

export function linkCheckoutPL(metadata: Record<string, unknown> | undefined): string {
  const u = new URL(CHECKOUT)
  for (const [k, v] of Object.entries(PARAMS_FIXOS)) u.searchParams.set(k, v)
  for (const k of UTM_KEYS) {
    const v = metadata?.[k]
    if (typeof v === 'string' && v) u.searchParams.set(k, v)
  }
  return u.toString()
}

function imie(nome?: string): string {
  const n = (nome ?? '').trim().split(/\s+/)[0] ?? ''
  return n ? n.charAt(0).toUpperCase() + n.slice(1).toLowerCase() : ''
}

// Dois casos gramaticais: dopełniacz depois de "zakupu", biernik depois de "za".
const PRODUTO_GEN = '*28-dniowego Wyzwania Kalistenicznego*'
const PRODUTO_ACC = '*28-dniowe Wyzwanie Kalisteniczne*'
const PAGAR = 'Najszybciej i bez problemów z bankiem działa *Apple Pay* lub *Google Pay* — jeden dotyk i gotowe. Możesz też zapłacić kartą albo przez PayPal.'
const RODAPE = ['', 'Coś nie działa? Odpisz tutaj, pomogę. 💛', '', 'Jeśli wolisz, żebym już nie pisała, odpisz *NIE* i to wszystko.']

export function mensagemPL(caso: CasoPL, p: { nome?: string; tipoPagamento?: string; link: string }): string {
  const ola = imie(p.nome) ? `Cześć, ${imie(p.nome)} 👋` : 'Cześć 👋'
  const meio = MEIO[p.tipoPagamento ?? ''] ?? ''
  const corpo: Record<CasoPL, string[]> = {
    preenchido: [
      ola, '',
      `Widzimy, że wypełniłaś formularz zakupu ${PRODUTO_GEN}, ale płatność nie została dokończona.`,
      '', PAGAR, '',
      'Dokończ tutaj 👇', p.link,
    ],
    recusado: [
      ola, '',
      `Widzimy, że próbowałaś zapłacić za ${PRODUTO_ACC}, ale płatność ${meio} nie przeszła. Zdarza się to często: wiele polskich banków blokuje płatności zagraniczne.`,
      '', 'Spróbuj przez *Apple Pay* lub *Google Pay* — przechodzą najczęściej — albo przez PayPal, w tym samym koszyku 👇', p.link,
    ],
    cancelado: [
      ola, '',
      `Twoja płatność za ${PRODUTO_ACC} została anulowana, zanim się zakończyła.`,
      '', 'Możesz spróbować ponownie tutaj — najszybciej przez *Apple Pay* lub *Google Pay* 👇', p.link,
    ],
  }
  return [...corpo[caso], ...RODAPE].join('\n')
}
