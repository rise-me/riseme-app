// Como a lista das 20h (reembolsos + consultas) aparece no WhatsApp do responsável. Bruno, 08/11/2026: "mesma informação,
// apresentada de forma bonita: espaçamento, quebra de linha, negrito nas coisas certas, um emoji, nome da aluna, a demanda".
// Fonte única de formatação: usada por lista-20h.ts e reembolsos.ts (P0: nunca copiar).

const BANDEIRAS: [string, string][] = [
  ['1787', '🇵🇷'], ['1939', '🇵🇷'], ['1809', '🇩🇴'], ['1829', '🇩🇴'], ['1849', '🇩🇴'],
  ['591', '🇧🇴'], ['593', '🇪🇨'], ['595', '🇵🇾'], ['598', '🇺🇾'], ['502', '🇬🇹'], ['503', '🇸🇻'], ['504', '🇭🇳'], ['505', '🇳🇮'],
  ['506', '🇨🇷'], ['507', '🇵🇦'], ['420', '🇨🇿'], ['351', '🇵🇹'],
  ['34', '🇪🇸'], ['48', '🇵🇱'], ['52', '🇲🇽'], ['54', '🇦🇷'], ['51', '🇵🇪'], ['56', '🇨🇱'], ['57', '🇨🇴'], ['58', '🇻🇪'], ['53', '🇨🇺'],
  ['39', '🇮🇹'], ['40', '🇷🇴'], ['90', '🇹🇷'], ['55', '🇧🇷'], ['49', '🇩🇪'], ['44', '🇬🇧'], ['33', '🇫🇷'],
  ['1', '🇺🇸'],
]

/** Bandeira pelo DDI do telefone ("" para LID ou DDI desconhecido). */
export function bandeira(phone: string): string {
  const tel = String(phone).replace(/\D/g, '')
  if (!tel || String(phone).includes('@lid')) return ''
  return BANDEIRAS.find(([ddi]) => tel.startsWith(ddi))?.[1] ?? ''
}

/** Primeiro e último nome, capitalizados ("Yuliana Gongora Corrales" → "Yuliana Corrales"? não: "Yuliana Gongora"). */
export function nomeCurto(nome: string | null | undefined, vazio = 'aluna sem conta'): string {
  const partes = (nome ?? '').trim().split(/\s+/).filter(Boolean)
  if (!partes.length) return vazio
  const cap = (p: string) => (p.length > 2 ? p[0].toUpperCase() + p.slice(1).toLowerCase() : p.toLowerCase())
  return partes.slice(0, 2).map(cap).join(' ')
}

const PRODUTOS: [RegExp, string][] = [
  [/28 g[üu]nl[üu]k/i, 'Calistenia (versão em turco)'],
  [/military/i, 'Military 21 días'],
  [/desaf[ií]o de 28 d[ií]as de calistenia|calistenia en casa/i, 'Calistenia 28 días'],
  [/pase completo/i, 'Pase Completo'],
  [/protocolo/i, 'Protocolo Metabólico'],
  [/pilates/i, 'Pilates en la Pared'],
  [/yoga facial/i, 'Yoga Facial'],
  [/yoga en la silla/i, 'Yoga en la Silla'],
  [/cuerpo sexy/i, 'Cuerpo Sexy de Verano'],
  [/preparto/i, 'Preparto'],
  [/posparto/i, 'Posparto'],
]

/** Nome curto do produto, sem "RiseMe™ -" e sem o nome comercial inteiro. */
export function produtoCurto(nome: string | null | undefined): string {
  const n = (nome ?? '').replace(/RiseMe\u2122?\s*[-–]\s*/i, '').trim()
  return PRODUTOS.find(([re]) => re.test(n))?.[1] ?? (n || 'produto')
}

/** "78657 PYG" → "78.657 PYG"; "298.12 MXN" → "298,12 MXN"; "27 USD" → "US$ 27". */
export function valorBonito(valor: string | null | undefined): string {
  const m = (valor ?? '').trim().match(/^([\d.,]+)\s*([A-Z]{3})?/)
  if (!m) return valor ?? ''
  const num = Number(m[1].replace(/,/g, ''))
  const moeda = m[2] ?? ''
  if (!Number.isFinite(num)) return valor ?? ''
  const texto = num.toLocaleString('pt-BR', { minimumFractionDigits: Number.isInteger(num) ? 0 : 2, maximumFractionDigits: 2 })
  return moeda === 'USD' ? `US$ ${texto}` : `${texto} ${moeda}`.trim()
}

/** "CREDIT_CARD/CREDIT_CARD_MASTERCARD" → "cartão Mastercard"; "BILLET/MERCADO_PAGO" → "Mercado Pago". */
export function pagamentoBonito(p: string | null | undefined): string {
  const s = (p ?? '').toUpperCase()
  if (!s) return ''
  if (/MERCADO_PAGO/.test(s)) return 'Mercado Pago'
  if (/PAYPAL/.test(s)) return 'PayPal'
  if (/PIX/.test(s)) return 'Pix'
  if (/BILLET|BOLETO/.test(s)) return 'boleto'
  if (/DIRECT_DEBIT|BANK_DEBIT|PSE/.test(s)) return 'débito em conta / PSE'
  if (/DEBIT_CARD/.test(s)) return 'cartão de débito'
  if (/CREDIT_CARD/.test(s)) {
    const band = s.match(/CREDIT_CARD_([A-Z]+)/)?.[1]
    return band ? `cartão ${band[0] + band.slice(1).toLowerCase()}` : 'cartão'
  }
  return s.split('/').pop()!.toLowerCase().replace(/_/g, ' ')
}

/** "há 11 dias", "há 3 h". */
export function haQuanto(iso: string): string {
  const h = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 3_600_000))
  if (h < 48) return `há ${h} h`
  const d = Math.floor(h / 24)
  return `há ${d} dias`
}

/** "dom 08/11" em Brasília. */
export function dataHoje(): string {
  return new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'short', day: '2-digit', month: '2-digit' }).replace('.', '')
}

export function corta(t: string | null | undefined, n: number): string {
  const s = (t ?? '').replace(/\s+/g, ' ').trim()
  return s.length > n ? s.slice(0, n - 1).replace(/[\s,;:]+$/, '') + '…' : s
}

/** Resumo da consulta: separa "AÇÃO: … · resto" em [ação, resto]. */
export function separaAcao(resumo: string | null | undefined): { acao: string | null; resto: string } {
  const s = (resumo ?? '').trim()
  const m = s.match(/^AÇÃO:\s*(.+?)\s*·\s*([\s\S]*)$/)
  if (m) return { acao: m[1].trim(), resto: m[2].trim() }
  if (/^AÇÃO:/.test(s)) return { acao: s.replace(/^AÇÃO:\s*/, '').trim(), resto: '' }
  return { acao: null, resto: s }
}
