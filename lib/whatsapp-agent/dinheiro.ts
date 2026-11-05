// Assunto de dinheiro na conversa: quando a aluna fala de cobrança, reembolso, cancelamento ou golpe, o servidor
// consulta a Hotmart (lib/hotmart-api.ts) ANTES de chamar o agente e entrega o resultado como fato no perfil.
// Uma lista só de sinais, em todos os idiomas do suporte (es, pt, pl, cs, it, tr, en). Fonte: 151 conversas com
// sinal de dinheiro em 05/10–04/11/2026 (mapa do WhatsApp, fluxo "Problema com dinheiro").
import type { MensagemConversa } from './responder'
import { resumoHotmart, hotmartConfigurada } from '@/lib/hotmart-api'

export const SINAL_DINHEIRO =
  /re?embols|rembols|reembol|devoluci|devuelv|devolv|\bHP\d{6,}|cobr|cargo|cobro|pag[oóaué]|dinero|dinheiro|tarjeta|cart[aã]o|banco|estaf|fraud|robo|roband|golpe|cancel|anul|suscrip|assinatur|mensualid|factur|transacci|refund|charge|scam|subscri|zwrot|oszust|p[łl]atno|pieni|anulow|subskryp|vr[aá]cen|podvod|platb|zru[sš]|rimbors|truffa|pagament|annull|abbonament|iade|dolandır|ödeme|iptal|abonelik/i

export function assuntoDeDinheiro(conversa: MensagemConversa[], horas = 72): boolean {
  const desde = Date.now() - horas * 3_600_000
  return conversa.some((m) => m.autor === 'student' && new Date(m.em).getTime() >= desde && SINAL_DINHEIRO.test(m.texto))
}

/** Último e-mail que a aluna digitou na conversa (minúsculo), ou null. */
export function emailNaConversa(conversa: MensagemConversa[]): string | null {
  const emails = conversa.filter((m) => m.autor === 'student').flatMap((m) => m.texto.match(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g) ?? [])
  return emails.length ? emails[emails.length - 1].toLowerCase() : null
}

/**
 * Bloco HOTMART para o agente, só quando o assunto é dinheiro e há um e-mail para consultar (o da conta ou o que ela
 * digitou). null = não consultou (sem assunto, sem e-mail, sem credencial ou API fora): o agente segue como antes.
 */
// `forcar` (05/11/2026, caso Agustina "rembolso"): quem decide se é dinheiro é o classificador com IA (assuntos.ts), não esta lista de
// palavras; a lista fica só como atalho barato. Com forcar=true a consulta sai mesmo sem palavra reconhecida.
export async function blocoHotmart(conversa: MensagemConversa[], emailDaConta: string | string[] | null, opts: { forcar?: boolean } = {}): Promise<string | null> {
  if (!hotmartConfigurada()) return null
  if (!opts.forcar && !assuntoDeDinheiro(conversa)) return null
  const digitado = emailNaConversa(conversa)
  // E-mail trocado pelo bot (lib/whatsapp-agent/acesso.ts): a Hotmart guarda a compra no e-mail antigo, por isso vêm os dois.
  const daConta = Array.isArray(emailDaConta) ? emailDaConta : [emailDaConta]
  const emails = [...new Set([...daConta, digitado].filter((e): e is string => Boolean(e)))]
  if (!emails.length) return null
  const blocos: string[] = []
  for (const e of emails) {
    const r = await resumoHotmart(e).catch((err) => {
      console.error(`[hotmart] consulta falhou (${e}):`, err)
      return null
    })
    if (r) blocos.push(r)
  }
  return blocos.length ? blocos.join('\n\n') : null
}
