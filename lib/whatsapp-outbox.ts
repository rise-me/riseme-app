// Fila de envio do WhatsApp (migration_009). Quem quer mandar mais tarde ENFILEIRA;
// o cron /api/whatsapp/outbox (a cada minuto) chama processarFila(), que envia o que
// venceu, registra no histórico como 'system' e apaga a senha do body depois do envio.

import { sendZapiText, toZapiPhone } from '@/lib/zapi'
import { admin, registrarMensagem } from '@/lib/whatsapp-agent/conversa'

const MAX_TENTATIVAS = 5
const REPROGRAMAR_MS = 2 * 60_000
const POR_RODADA = 15 // ~3 s por envio (delayTyping) — cabe nos 60 s do cron; pico real é bem menor
const TRAVA_EXPIRA_MS = 5 * 60_000 // função morta no meio do envio não prende o item pra sempre
const MASCARA = '••••••'

export async function enfileirar(m: {
  phone: string
  kind: string
  body: string
  sendAfter: Date
  mask?: string
  dependsOn?: number
}): Promise<number | null> {
  const { data, error } = await admin()
    .from('whatsapp_outbox')
    .insert({
      phone: m.phone,
      kind: m.kind,
      body: m.body,
      mask: m.mask ?? null,
      depends_on: m.dependsOn ?? null,
      send_after: m.sendAfter.toISOString(),
    })
    .select('id')
    .single()
  if (error) {
    console.error(`[outbox] falha ao enfileirar ${m.kind} (${m.phone}):`, error.message)
    return null
  }
  return data.id as number
}

interface Item {
  id: number
  phone: string
  kind: string
  body: string
  mask: string | null
  depends_on: number | null
  attempts: number
}

const INTERVALO_MIN_MS = 40_000 // entre msgs da mesma sequência, mesmo quando as duas venceram juntas

async function dependenciaPendente(id: number): Promise<boolean> {
  const { data } = await admin().from('whatsapp_outbox').select('sent_at, attempts').eq('id', id).maybeSingle()
  if (!data) return false
  // Dependência que desistiu (MAX_TENTATIVAS) não segura a fila pra sempre.
  if (!data.sent_at) return data.attempts < MAX_TENTATIVAS
  // Já saiu, mas agora há pouco: segura pra não chegar grudada na anterior.
  return Date.now() - new Date(data.sent_at).getTime() < INTERVALO_MIN_MS
}

const travaVencida = () => new Date(Date.now() - TRAVA_EXPIRA_MS).toISOString()

export async function processarFila(): Promise<{ enviados: number; falhas: number }> {
  const db = admin()
  const agora = new Date().toISOString()
  const { data } = await db
    .from('whatsapp_outbox')
    .select('id, phone, kind, body, mask, depends_on, attempts')
    .is('sent_at', null)
    .or(`claimed_at.is.null,claimed_at.lt.${travaVencida()}`)
    .lt('attempts', MAX_TENTATIVAS)
    .lte('send_after', agora)
    .order('send_after', { ascending: true })
    .limit(POR_RODADA)

  let enviados = 0
  let falhas = 0
  for (const item of (data ?? []) as Item[]) {
    // Trava: só quem conseguir marcar claimed_at envia (cron sobreposto não duplica).
    const { data: trava } = await db
      .from('whatsapp_outbox')
      .update({ claimed_at: new Date().toISOString() })
      .eq('id', item.id)
      .is('sent_at', null)
      .or(`claimed_at.is.null,claimed_at.lt.${travaVencida()}`)
      .select('id')
    if (!trava?.length) continue

    // Ordem garantida: a msg de apoio só sai depois da de acesso.
    if (item.depends_on && (await dependenciaPendente(item.depends_on))) {
      await db
        .from('whatsapp_outbox')
        .update({ claimed_at: null, send_after: new Date(Date.now() + 60_000).toISOString() })
        .eq('id', item.id)
      continue
    }

    const r = await sendZapiText({ phone: item.phone, message: item.body, delayTyping: 3 })
    if (!r.ok) {
      falhas++
      console.error(`[outbox] envio falhou (#${item.id} ${item.kind} ${item.phone}, tentativa ${item.attempts + 1}):`, r.error)
      await db
        .from('whatsapp_outbox')
        .update({
          claimed_at: null,
          attempts: item.attempts + 1,
          last_error: r.error.slice(0, 500),
          send_after: new Date(Date.now() + REPROGRAMAR_MS).toISOString(),
        })
        .eq('id', item.id)
      continue
    }

    enviados++
    const corpoSeguro = item.mask ? item.body.replaceAll(item.mask, MASCARA) : item.body
    await db
      .from('whatsapp_outbox')
      .update({ sent_at: new Date().toISOString(), body: corpoSeguro, mask: null, attempts: item.attempts + 1 })
      .eq('id', item.id)
    // Histórico do agente + marca o messageId como do sistema (senão o webhook
    // "enviada por mim" acha que foi uma pessoa e cala o bot).
    await registrarMensagem({
      phone: toZapiPhone(item.phone),
      direction: 'out',
      author: 'system',
      body: corpoSeguro,
      waMessageId: r.messageId,
    })
  }
  return { enviados, falhas }
}
