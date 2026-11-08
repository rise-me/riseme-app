// Regras COMUNS da recuperação de compra por WhatsApp (14/10/2026) — usadas pelas rotas da Hotmart (CL-ES) e da
// Perfect Pay (CL-PL). Textos, ofertas e links ficam nos arquivos de cada caso (lib/recuperacao.ts, lib/recuperacao-pl.ts).
//
// - 15 min depois da tentativa; se a compra aprovar antes, a mensagem pendente é apagada.
// - 1 mensagem por número a cada 48 h (várias tentativas seguidas viram uma só).
// - Não manda para: quem pediu para parar (marcador do bot), quem já recebeu acesso, quem já tem conta no app.
// - Telefone na fila = só dígitos com DDI (chave da conversa do bot). Sem país conhecido, não manda.

import { enfileirar, jaEnfileirou, pediuParaParar } from '@/lib/whatsapp-outbox'
import { admin, variantesTelefone } from '@/lib/whatsapp-agent/conversa'
import { toE164 } from '@/lib/phone'
import { toZapiPhone } from '@/lib/zapi'

export const ESPERA_MS = 15 * 60_000
export const JANELA_MS = 48 * 3600_000
const KIND = 'recuperacao'

export function telefoneRecuperacao(raw: string | undefined, opts: { countryIso?: string; locale?: string }): string | undefined {
  const { phone, hadCountry } = toE164(raw, opts)
  return phone && hadCountry ? toZapiPhone(phone) : undefined
}

/** Compra aprovada: apaga a recuperação que ainda não saiu (pelo telefone ou pelo email que está no link). */
export async function cancelarRecuperacao(p: { phone?: string; email?: string }): Promise<void> {
  const filtros = [
    ...(p.phone ? variantesTelefone(p.phone).map((v) => `phone.eq.${v}`) : []),
    p.email ? `body.ilike.%${encodeURIComponent(p.email)}%` : null,
  ].filter(Boolean)
  if (!filtros.length) return
  await admin().from('whatsapp_outbox').delete().eq('kind', KIND).is('sent_at', null).or(filtros.join(','))
}

// v3 do mapa (Bruno 08/11/2026: "ok, pode fazer"): 2º toque 24–36 h depois da recuperação, uma vez, só se ela não comprou,
// não respondeu nada e não pediu para parar; de dia no fuso dela; poucas por hora. Só CL-ES (link da Hotmart no texto).
export const KIND_2 = 'recuperacao-2'
const TOQUE2_MINUTO = 41
const TOQUE2_POR_HORA = 10
const TOQUE2 = (link: string) =>
  'Hola 💛 Ayer intentaste entrar al Desafío de Calistenia y el pago no se completó.\n\n' +
  `Si todavía quieres, tu enlace sigue aquí, con el mismo precio: ${link}\n\n` +
  'Si el problema fue la tarjeta, en el mismo checkout puedes elegir PayPal, Nequi, Yape, PSE u Oxxo, según tu país. ¿Te ayudo con algo?'

export async function segundoToqueRecuperacao(): Promise<number> {
  if (new Date().getMinutes() !== TOQUE2_MINUTO) return 0
  const { horaLocal } = await import('@/lib/video-depoimento')
  const db = admin()
  const ate = new Date(Date.now() - 24 * 3600_000).toISOString()
  const desde = new Date(Date.now() - 36 * 3600_000).toISOString()
  const { data: primeiras } = await db.from('whatsapp_outbox').select('phone, body, sent_at').eq('kind', KIND).gte('sent_at', desde).lte('sent_at', ate).order('sent_at', { ascending: false })
  let n = 0
  let t = Date.now() + 60_000
  const vistos = new Set<string>()
  for (const r of primeiras ?? []) {
    if (n >= TOQUE2_POR_HORA) break
    const tel = String(r.phone).replace(/\D/g, '')
    if (!tel || vistos.has(tel.slice(-9))) continue
    vistos.add(tel.slice(-9))
    const link = String(r.body).match(/https:\/\/pay\.hotmart\.com\/\S+/)?.[0]
    if (!link) continue // Perfect Pay (CL-PL) fica de fora por enquanto
    const hora = horaLocal(tel)
    if (hora < 10 || hora >= 20) continue
    if ((await jaEnfileirou(tel, KIND_2)) || (await jaEnfileirou(tel, 'acesso')) || (await pediuParaParar(tel))) continue
    const { count: falou } = await db.from('whatsapp_messages').select('id', { count: 'exact', head: true }).in('phone', variantesTelefone(tel)).eq('direction', 'in').gte('created_at', r.sent_at)
    if ((falou ?? 0) > 0) continue // respondeu: o bot já está com ela
    await enfileirar({ phone: tel, kind: KIND_2, body: TOQUE2(link), sendAfter: new Date(t) })
    t += 90_000
    n++
  }
  return n
}

/** Enfileira a mensagem respeitando as regras. Devolve o motivo quando pula. */
export async function agendarRecuperacao(p: { phone?: string; email?: string; body: string }): Promise<{ ok: true } | { skipped: string }> {
  const { phone, email, body } = p
  if (!phone) return { skipped: 'telefone' }
  const db = admin()
  if ((await pediuParaParar(phone)) || (await jaEnfileirou(phone, 'acesso'))) return { skipped: 'optout ou ja aluna' }
  if (email) {
    const { count } = await db.from('users').select('id', { count: 'exact', head: true }).eq('email', email)
    if ((count ?? 0) > 0) return { skipped: 'ja compradora' }
  }
  const { count: recentes } = await db
    .from('whatsapp_outbox')
    .select('id', { count: 'exact', head: true })
    .eq('kind', KIND)
    .in('phone', variantesTelefone(phone))
    .gte('created_at', new Date(Date.now() - JANELA_MS).toISOString())
  if ((recentes ?? 0) > 0) return { skipped: 'ja enfileirada' }
  const id = await enfileirar({ phone, kind: KIND, body, sendAfter: new Date(Date.now() + ESPERA_MS) })
  return id ? { ok: true } : { skipped: 'fila' }
}
