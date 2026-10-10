import { NextRequest, NextResponse, after } from 'next/server'
import { etiquetar, marcarNaoLida, sendZapiText } from '@/lib/zapi'
import { decidirResposta } from '@/lib/whatsapp-agent/responder'
import {
  abrirChat,
  historico,
  mensagemJaRegistrada,
  passarParaHumano,
  perfilDaAluna,
  registrarMensagem,
  salvarLid,
  telefoneDoLid,
  ultimaEntrada,
  vincularPorEmail,
  voltarParaBot,
} from '@/lib/whatsapp-agent/conversa'

// POST /api/whatsapp/zapi?s=<ZAPI_WEBHOOK_SECRET> — webhook "Ao receber" da Z-API.
// A Z-API não assina o webhook: a autenticação é o segredo na URL + o instanceId.
// Responde 200 na hora e processa depois (after) — a Z-API não espera o Claude.
//
// Painel Z-API: webhook "Ao receber" = https://<app>/api/whatsapp/zapi?s=<segredo>
// e ligar "notificar as enviadas por mim" — é assim que sabemos que uma PESSOA
// respondeu pelo celular (aí o bot se cala nesse número por HORAS_PESSOA).

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const ESPERA_AGRUPAR_MS = 6000 // aluna manda 3 mensagens seguidas → 1 resposta só
const HORAS_PESSOA = 12 // pessoa respondeu pelo celular → bot calado por 12h
const HORAS_HANDOFF = 24 // agente pediu humano → bot calado por 24h
// Etiquetas do WhatsApp Business no celular do suporte (ids da conta; ver lib/zapi.ts → etiquetar).
// Respondeu = filtro pra revisar o que o Claude falou; transferiu = pendente (vai também como NÃO LIDA).
const TAG_RESPONDEU = process.env.ZAPI_TAG_CLAUDE_RESPONDEU
const TAG_TRANSFERIU = process.env.ZAPI_TAG_CLAUDE_TRANSFERIU

interface ZapiCallback {
  type?: string
  instanceId?: string
  messageId?: string
  phone?: string
  fromMe?: boolean
  isGroup?: boolean
  isNewsletter?: boolean
  broadcast?: boolean
  isStatusReply?: boolean
  senderName?: string
  senderLid?: string
  chatLid?: string
  participantLid?: string | null
  text?: { message?: string }
  audio?: unknown
  image?: { caption?: string }
  video?: { caption?: string }
  document?: { fileName?: string }
  sticker?: unknown
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms))

// O agente só lê texto. O resto vira uma descrição pra ele saber o que chegou.
function textoDa(m: ZapiCallback): string | null {
  if (m.text?.message) return m.text.message
  if (m.audio) return '[a aluna mandou um ÁUDIO — você não consegue ouvir; peça com carinho para escrever]'
  if (m.image) return `[a aluna mandou uma IMAGEM${m.image.caption ? ` com a legenda: ${m.image.caption}` : ''}]`
  if (m.video) return `[a aluna mandou um VÍDEO${m.video.caption ? ` com a legenda: ${m.video.caption}` : ''}]`
  if (m.document) return `[a aluna mandou um DOCUMENTO: ${m.document.fileName ?? 'sem nome'}]`
  if (m.sticker) return '[a aluna mandou uma figurinha]'
  return null
}

async function avisarHumano(phone: string, nome: string | undefined, motivo: string) {
  const destino = process.env.WHATSAPP_HANDOFF_PHONE
  if (!destino) {
    console.warn(`[whatsapp] handoff sem WHATSAPP_HANDOFF_PHONE — ${phone}: ${motivo}`)
    return
  }
  const message = `⚠️ RiseMe — conversa precisa de uma pessoa\n${nome ?? 'Aluna'} (+${phone})\nMotivo: ${motivo}${phone.endsWith('@lid') ? '' : `\nhttps://wa.me/${phone}`}`
  const r = await sendZapiText({ phone: destino, message })
  if (!r.ok) console.error('[whatsapp] aviso de handoff falhou:', r.error)
  else await registrarMensagem({ phone: destino.replace(/\D/g, ''), direction: 'out', author: 'system', body: message, waMessageId: r.messageId })
}

// waMessageId null = reprocessar (sem esperar agrupamento): conversa que ficou sem resposta.
async function processarEntrada(phone: string, waMessageId: string | null) {
  if (waMessageId) {
    await esperar(ESPERA_AGRUPAR_MS)
    if ((await ultimaEntrada(phone)) !== waMessageId) return // chegou outra depois: ela responde tudo
  }

  const chat = await abrirChat(phone)
  if (chat.modoHumano) return

  const conversa = await historico(phone)
  const porEmail = chat.userId ? null : await vincularPorEmail(conversa)
  const userId = chat.userId ?? porEmail
  const perfil = userId ? await perfilDaAluna(userId, !porEmail) : null

  let decisao
  try {
    decisao = await decidirResposta({ perfil, conversa, agora: new Date().toISOString() })
  } catch (err) {
    // O texto do erro vai junto: sem ele, uma pane do agente (chave, saldo, limite) só aparece
    // como "erro no agente" e ninguém sabe a causa (10/10/2026: 16 alunas sem resposta por horas).
    const detalhe = (err instanceof Error ? err.message : String(err)).replace(/\s+/g, ' ').slice(0, 300)
    console.error(`[whatsapp] agente falhou (${phone}):`, err)
    await passarParaHumano(phone, HORAS_HANDOFF, `erro no agente: ${detalhe}`)
    await avisarHumano(phone, perfil?.nome, `o agente deu erro ao responder — ${detalhe}`)
    return
  }

  if (decisao.texto) {
    const envio = await sendZapiText({ phone, message: decisao.texto, delayTyping: 2 })
    if (envio.ok) {
      await registrarMensagem({ phone, direction: 'out', author: 'agent', body: decisao.texto, waMessageId: envio.messageId })
    } else {
      console.error(`[whatsapp] envio da resposta falhou (${phone}):`, envio.error)
    }
  }

  if (decisao.tipo === 'humano') {
    await passarParaHumano(phone, HORAS_HANDOFF, decisao.motivo)
    await avisarHumano(phone, perfil?.nome, decisao.motivo)
    if (TAG_TRANSFERIU) await etiquetar(phone, TAG_TRANSFERIU)
    if (TAG_RESPONDEU) await etiquetar(phone, TAG_RESPONDEU, 'remove')
    await marcarNaoLida(phone)
  } else if (TAG_RESPONDEU) {
    await etiquetar(phone, TAG_RESPONDEU)
    if (TAG_TRANSFERIU) await etiquetar(phone, TAG_TRANSFERIU, 'remove')
  }
}

// Mensagem "enviada por mim" que NÃO foi o sistema (nem o agente, nem o acesso)
// = uma pessoa digitou no celular. Espera um pouco porque o webhook do envio do
// próprio sistema pode chegar antes de a gente gravar o messageId.
async function processarSaida(chave: string, lid: string | null, waMessageId: string, texto: string) {
  await esperar(4000)
  // Resposta pelo celular costuma vir com o LID no lugar do telefone: casa com o chat da aluna.
  const phone = (lid && (await telefoneDoLid(lid))) || chave
  if (await mensagemJaRegistrada(waMessageId)) return
  await registrarMensagem({ phone, direction: 'out', author: 'human', body: texto, waMessageId })
  await passarParaHumano(phone, HORAS_PESSOA, 'pessoa respondeu pelo celular')
}

export async function POST(request: NextRequest) {
  const segredo = process.env.ZAPI_WEBHOOK_SECRET
  if (!segredo || request.nextUrl.searchParams.get('s') !== segredo) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ?acao=reprocessar + { phone }: devolve a conversa ao bot e faz o agente responder o que ficou
  // parado (pane do agente, pendentes antigos). Mesmo segredo do webhook; uso manual/scripts.
  if (request.nextUrl.searchParams.get('acao') === 'reprocessar') {
    const alvo = ((await request.json().catch(() => null)) as { phone?: string } | null)?.phone
    if (!alvo) return NextResponse.json({ error: 'phone obrigatório' }, { status: 400 })
    await voltarParaBot(alvo)
    after(() => processarEntrada(alvo, null))
    return NextResponse.json({ ok: true, reprocessando: alvo })
  }

  const m = (await request.json().catch(() => null)) as ZapiCallback | null
  if (!m || m.instanceId !== process.env.ZAPI_INSTANCE_ID) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }

  if (m.type !== 'ReceivedCallback' || m.isGroup || m.isNewsletter || m.broadcast || m.isStatusReply) {
    return NextResponse.json({ ok: true, skipped: 'not a direct message' })
  }
  // phone pode vir como telefone ("5511…") ou como LID ("1453…@lid"); chatLid é o LID estável.
  const ehLid = (m.phone ?? '').includes('@lid')
  const lid = (m.chatLid ?? (ehLid ? m.phone : '') ?? '').replace(/\D/g, '') || null
  const phone = ehLid ? `${lid}@lid` : (m.phone ?? '').replace(/\D/g, '')
  const texto = textoDa(m)
  if (!phone || !m.messageId || !texto) return NextResponse.json({ ok: true, skipped: 'empty' })
  const waMessageId = m.messageId

  if (m.fromMe) {
    after(() => processarSaida(phone, lid, waMessageId, texto))
    return NextResponse.json({ ok: true })
  }

  if (lid && !ehLid) await salvarLid(phone, lid)
  const nova = await registrarMensagem({ phone, direction: 'in', author: 'student', body: texto, waMessageId })
  if (nova) after(() => processarEntrada(phone, waMessageId))
  return NextResponse.json({ ok: true })
}
