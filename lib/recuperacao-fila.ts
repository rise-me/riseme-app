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
