// Fila de envio do WhatsApp (migration_009). Quem quer mandar mais tarde ENFILEIRA;
// o cron /api/whatsapp/outbox (a cada minuto) chama processarFila(), que envia o que
// venceu, registra no histórico como 'system' e apaga a senha do body depois do envio.

import { sendZapiText, toZapiPhone } from '@/lib/zapi'
import { admin, registrarMensagem, variantesTelefone } from '@/lib/whatsapp-agent/conversa'
import { decidirResposta } from '@/lib/whatsapp-agent/responder'

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

/** Já existe mensagem desse tipo (enviada ou na fila) para este número? Ex.: pedido de depoimento, 1x por aluna. */
export async function jaEnfileirou(phone: string, kind: string): Promise<boolean> {
  const { count } = await admin()
    .from('whatsapp_outbox')
    .select('id', { count: 'exact', head: true })
    .eq('phone', phone)
    .eq('kind', kind)
  return (count ?? 0) > 0
}

/**
 * A pessoa pediu para não receber mais mensagens (o agente registra com registrarPedidoParaParar).
 * Marcador = linha 'optout' já marcada como enviada (a fila ignora). Confere todas as formas do número.
 * QUEM MANDA MENSAGEM ATIVA (recuperação, depoimento, Pase, reenvio) DEVE checar isto antes.
 */
export async function pediuParaParar(phone: string): Promise<boolean> {
  const formas = variantesTelefone(phone).flatMap((v) => [v, `+${v}`])
  const { count } = await admin()
    .from('whatsapp_outbox')
    .select('id', { count: 'exact', head: true })
    .in('phone', formas)
    .eq('kind', 'optout')
  return (count ?? 0) > 0
}

export async function registrarPedidoParaParar(phone: string): Promise<void> {
  if (await pediuParaParar(phone)) return
  await marcarNaFila(phone, 'optout')
}

/** Linha inerte (já "enviada") que só registra um fato: opt-out, brinde entregue… — a fila ignora. */
export async function marcarNaFila(phone: string, kind: string, body = ''): Promise<void> {
  const agora = new Date().toISOString()
  await admin()
    .from('whatsapp_outbox')
    .insert({ phone: phone.replace(/\D/g, ''), kind, body, send_after: agora, sent_at: agora })
}

// Não manda convite/oferta para quem pediu para parar, já recebeu um igual (por qualquer forma do número),
// está sendo atendida por uma pessoa ou tem consulta aberta (reclamação, reembolso…).
/** Hora (ISO) em que a mensagem de acesso desta aluna ainda vai sair, ou null se já saiu / não há. */
export async function acessoPendente(phone: string): Promise<string | null> {
  const formas = variantesTelefone(phone).flatMap((v) => [v, `+${v}`])
  const { data } = await admin()
    .from('whatsapp_outbox')
    .select('send_after')
    .in('phone', formas)
    .in('kind', ['acesso', 'acesso-retro'])
    .is('sent_at', null)
    .lt('attempts', MAX_TENTATIVAS)
    .order('send_after', { ascending: true })
    .limit(1)
  return data?.[0]?.send_after ?? null
}

// Convite de depoimento NÃO vai para quem está com problema (casos 17–18/10: "quer favor? responde minhas
// perguntas"; "estão roubando"): última fala dela sem resposta, ou reclamação/dinheiro nos últimos 3 dias.
const SINAL_DE_PROBLEMA = /reembols|devoluci|estaf|fraud|robo|roband|denunc|cancel|no funciona|no puedo|zwrot|oszust|nie dzia|anul|iade|dolandır|refund|scam/i
export async function estaComProblema(phone: string): Promise<boolean> {
  const formas = variantesTelefone(phone)
  const { data } = await admin()
    .from('whatsapp_messages')
    .select('author, body, created_at')
    .in('phone', formas)
    .gte('created_at', new Date(Date.now() - 3 * 86_400_000).toISOString())
    .order('created_at', { ascending: false })
    .limit(40)
  const ms = (data ?? []).filter((m) => m.author !== 'system')
  if (ms[0]?.author === 'student') return true
  return ms.some((m) => m.author === 'student' && SINAL_DE_PROBLEMA.test(m.body))
}

async function motivoParaPular(phone: string, kind: string, id: number): Promise<string | null> {
  if (await pediuParaParar(phone)) return 'pediu para não receber mensagens'
  if (kind === 'depoimento' && (await estaComProblema(phone))) return 'aluna com problema/pergunta aberta'
  const formas = variantesTelefone(phone).flatMap((v) => [v, `+${v}`])
  const db = admin()
  const [{ count: jaFoi }, { data: chats }, { count: consultas }] = await Promise.all([
    db.from('whatsapp_outbox').select('id', { count: 'exact', head: true }).in('phone', formas).eq('kind', kind).not('sent_at', 'is', null).neq('id', id),
    db.from('whatsapp_chats').select('mode, human_until').in('phone', formas),
    db.from('whatsapp_consultas').select('id', { count: 'exact', head: true }).in('phone', formas).eq('status', 'pendente'),
  ])
  if (jaFoi) return 'já recebeu'
  if ((chats ?? []).some((c) => c.mode === 'human' && (!c.human_until || new Date(c.human_until) > new Date()))) return 'pessoa atendendo'
  if (consultas) return 'consulta aberta'
  return null
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

    // Convite de depoimento/oferta agendado: confere na hora de enviar se ainda faz sentido.
    if (item.kind === 'depoimento' || item.kind === 'pase' || item.kind === 'depo-hotmart') {
      const motivo = await motivoParaPular(item.phone, item.kind, item.id)
      if (motivo) {
        await db
          .from('whatsapp_outbox')
          .update({ attempts: MAX_TENTATIVAS, last_error: `pulado: ${motivo}`, claimed_at: null })
          .eq('id', item.id)
        continue
      }
    }

    // 'etiquetar-prova' não manda nada: põe a etiqueta "⭐ Enviou prova social" numa conversa antiga (o registro
    // retroativo é feito daqui porque a chave da Z-API só existe no servidor; 26/10/2026).
    if (item.kind === 'etiquetar-prova') {
      const { marcarProvaSocial } = await import('@/lib/whatsapp-agent/prova-social')
      await marcarProvaSocial(item.phone, item.body)
      await db.from('whatsapp_outbox').update({ sent_at: new Date().toISOString(), attempts: item.attempts + 1 }).eq('id', item.id)
      continue
    }
    // 'etiquetar-post': idem para "💬 Depoimento no post" (print do comentário, retroativo; 27/10/2026).
    if (item.kind === 'etiquetar-post') {
      const { marcarDepoimentoNoPost } = await import('@/lib/whatsapp-agent/prova-social')
      await marcarDepoimentoNoPost(item.phone)
      await db.from('whatsapp_outbox').update({ sent_at: new Date().toISOString(), attempts: item.attempts + 1 }).eq('id', item.id)
      continue
    }

    // 'teste-agente' não manda nada: roda o agente num caso de teste (body = JSON {perfil, msgs}) e grava a decisão
    // no próprio body. Serve para testar mudança de prompt no servidor, onde está a chave da Anthropic (19/10/2026).
    if (item.kind === 'teste-agente') {
      let saida: string
      try {
        const caso = JSON.parse(item.body) as { nome: string; perfil: Parameters<typeof decidirResposta>[0]['perfil']; msgs: string[] }
        const agora = new Date().toISOString()
        const d = await decidirResposta({ perfil: caso.perfil, conversa: caso.msgs.map((t) => ({ autor: 'student' as const, texto: t, em: agora })), agora })
        saida = JSON.stringify({ ...caso, resultado: d })
      } catch (err) {
        saida = JSON.stringify({ erro: String(err), entrada: item.body.slice(0, 500) })
      }
      await db.from('whatsapp_outbox').update({ sent_at: new Date().toISOString(), attempts: item.attempts + 1, body: saida }).eq('id', item.id)
      continue
    }

    // 'reprocessar' não manda texto: faz o agente retomar a conversa (o que ficou sem resposta) pelo
    // próprio servidor. Assim dá para destravar alunas sem a chave da Z-API sair da Vercel (16/10/2026).
    if (item.kind === 'reprocessar') {
      const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://riseme.app'
      const res = await fetch(`${base}/api/whatsapp/zapi?acao=reprocessar&s=${process.env.ZAPI_WEBHOOK_SECRET}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: item.phone }),
      }).catch((err) => ({ ok: false, status: String(err) }) as const)
      await db
        .from('whatsapp_outbox')
        .update(res.ok
          ? { sent_at: new Date().toISOString(), attempts: item.attempts + 1 }
          : { claimed_at: null, attempts: item.attempts + 1, last_error: `reprocessar ${res.status}`, send_after: new Date(Date.now() + REPROGRAMAR_MS).toISOString() })
        .eq('id', item.id)
      if (res.ok) enviados++
      else falhas++
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
