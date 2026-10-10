import { NextRequest, NextResponse, after } from 'next/server'
import { etiquetar, marcarNaoLida, sendZapiText } from '@/lib/zapi'
import { decidirResposta, redigirRespostaAprovada, type Consulta } from '@/lib/whatsapp-agent/responder'
import {
  abrirChat,
  aprendizadosAtivos,
  consultaPorAlerta,
  consultasPendentes,
  criarConsulta,
  fecharConsulta,
  marcarAlertaDaConsulta,
  salvarAprendizado,
  type ConsultaAberta,
  historico,
  mensagemJaRegistrada,
  passarParaHumano,
  perfilDaAluna,
  registrarMensagem,
  respostasRecentes,
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
  image?: { caption?: string; imageUrl?: string }
  referenceMessageId?: string // mensagem que esta responde (citação)
  video?: { caption?: string }
  document?: { fileName?: string }
  sticker?: unknown
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms))

// O agente só lê texto. O resto vira uma descrição pra ele saber o que chegou.
function textoDa(m: ZapiCallback): string | null {
  if (m.text?.message) return m.text.message
  if (m.audio) return '[a aluna mandou um ÁUDIO — você não consegue ouvir; peça com carinho para escrever]'
  // Com URL a imagem vai anexada pro agente VER (responder.ts lê "[IMAGEM: url]"); sem URL, só o aviso.
  if (m.image) {
    const legenda = m.image.caption ? ` Legenda: ${m.image.caption}` : ''
    return m.image.imageUrl ? `[IMAGEM: ${m.image.imageUrl}]${legenda}` : `[a aluna mandou uma IMAGEM]${legenda}`
  }
  if (m.video) return `[a aluna mandou um VÍDEO${m.video.caption ? ` com a legenda: ${m.video.caption}` : ''}]`
  if (m.document) return `[a aluna mandou um DOCUMENTO: ${m.document.fileName ?? 'sem nome'}]`
  if (m.sticker) return '[a aluna mandou uma figurinha]'
  return null
}

// Mensagem do sistema para o responsável (registrada como 'system' pra não virar "pessoa respondeu").
async function dizerAoResponsavel(message: string): Promise<string | null> {
  const destino = process.env.WHATSAPP_HANDOFF_PHONE
  if (!destino) return null
  const r = await sendZapiText({ phone: destino, message })
  if (!r.ok) {
    console.error('[whatsapp] mensagem ao responsável falhou:', r.error)
    return null
  }
  await registrarMensagem({ phone: destino.replace(/\D/g, ''), direction: 'out', author: 'system', body: message, waMessageId: r.messageId })
  return r.messageId
}

// O número do responsável chega do WhatsApp sem o 9 (BR): compara só o final.
function ehResponsavel(phone: string): boolean {
  const destino = (process.env.WHATSAPP_HANDOFF_PHONE ?? '').replace(/\D/g, '')
  return Boolean(destino) && !phone.endsWith('@lid') && phone.slice(-8) === destino.slice(-8) && phone.slice(0, 4) === destino.slice(0, 4)
}

// Transferência = CONSULTA: quem é, o que disse, o resumo e 2 respostas possíveis. O responsável
// responde citando a mensagem (A, B, texto livre ou "pular") — ver responderConsulta.
async function consultarResponsavel(phone: string, nome: string | undefined, idioma: string, ultimaFala: string, motivo: string, c: Consulta) {
  const id = await criarConsulta({ ...c, phone, nome, motivo })
  if (!id) return avisarHumano(phone, nome, motivo) // tabela indisponível → aviso simples, como antes
  const fala = ultimaFala.replace(/\[IMAGEM: [^\]]+\]/g, '[imagem]').slice(0, 400)
  const msg = [
    `🟡 *Consulta #${id}* — ${nome ?? 'Aluna sem conta'} (${idioma}) +${phone.replace('@lid', ' · sem número')}`,
    '',
    `*Ela disse:* «${fala}»`,
    `*Resumo:* ${c.resumo}`,
    '',
    c.opcaoA ? `*A)* ${c.opcaoA}` : '',
    c.opcaoA ? '' : null,
    c.opcaoB ? `*B)* ${c.opcaoB}` : '',
    c.opcaoB ? '' : null,
    'Responda *citando esta mensagem*: *A*, *B* ou escreva o que responder (eu mando no idioma dela). *pular* = você responde direto no celular do suporte.',
  ].filter((l) => l !== null).join('\n')
  const alertId = await dizerAoResponsavel(msg)
  if (alertId) await marcarAlertaDaConsulta(id, alertId)
}

// O responsável respondeu no WhatsApp dele. Descobre a consulta (citação → #id → única pendente),
// manda a resposta para a aluna no idioma dela, aprende quando a orientação é geral e devolve o chat ao bot.
async function responderConsulta(texto: string, citada: string | undefined) {
  const pendentes = await consultasPendentes()
  const porId = texto.match(/^#?(\d+)\b[\s:.-]*/)
  let consulta: ConsultaAberta | null = (citada && (await consultaPorAlerta(citada))) || null
  let corpo = texto.trim()
  if (!consulta && porId) {
    consulta = pendentes.find((p) => p.id === Number(porId[1])) ?? null
    if (consulta) corpo = corpo.slice(porId[0].length).trim()
  }
  if (!consulta && pendentes.length === 1) consulta = pendentes[0]
  if (!consulta) {
    await dizerAoResponsavel(
      pendentes.length
        ? `Não sei de qual consulta é essa resposta — há ${pendentes.length} pendentes (${pendentes.map((p) => `#${p.id}`).join(', ')}). Responda *citando* a mensagem da consulta, ou comece com o número: "#${pendentes[0].id} A".`
        : 'Não há consulta pendente agora.'
    )
    return
  }

  const cmd = corpo.toLowerCase().replace(/[.!\s]+$/g, '')
  if (cmd === 'pular' || cmd === 'pula') {
    await fecharConsulta(consulta.id, { status: 'pulada' })
    await dizerAoResponsavel(`⏭️ Consulta #${consulta.id} pulada — a conversa fica com você no celular do suporte.`)
    return
  }
  const orientacao = cmd === 'a' ? consulta.opcaoA : cmd === 'b' ? consulta.opcaoB : corpo
  if (!orientacao) {
    await dizerAoResponsavel(`A consulta #${consulta.id} não tem essa opção. Escreva o que responder.`)
    return
  }

  try {
    const chat = await abrirChat(consulta.phone)
    const conversa = await historico(consulta.phone)
    const porEmail = chat.userId ? null : await vincularPorEmail(conversa)
    const userId = chat.userId ?? porEmail
    const perfil = userId ? await perfilDaAluna(userId, !porEmail) : null
    const { mensagem, aprendizado } = await redigirRespostaAprovada({ perfil, conversa, resumo: consulta.resumo, orientacao })
    const envio = await sendZapiText({ phone: consulta.phone, message: mensagem, delayTyping: 2 })
    if (!envio.ok) throw new Error(`envio à aluna falhou: ${envio.error}`)
    await registrarMensagem({ phone: consulta.phone, direction: 'out', author: 'agent', body: mensagem, waMessageId: envio.messageId })
    await fecharConsulta(consulta.id, { status: 'respondida', orientacao, respostaEnviada: mensagem })
    if (aprendizado) await salvarAprendizado(aprendizado, consulta.id)
    await voltarParaBot(consulta.phone)
    if (TAG_RESPONDEU) await etiquetar(consulta.phone, TAG_RESPONDEU)
    if (TAG_TRANSFERIU) await etiquetar(consulta.phone, TAG_TRANSFERIU, 'remove')
    await dizerAoResponsavel(
      `✅ Consulta #${consulta.id} — enviado para ${consulta.nome ?? 'a aluna'}:\n\n«${mensagem}»\n\n` +
        (aprendizado
          ? `📚 Aprendi (vou responder sozinho da próxima vez):\n*Pergunta:* ${aprendizado.pergunta}\n*Resposta:* ${aprendizado.resposta}`
          : '📌 Não virou regra: entendi que vale só para este caso.')
    )
  } catch (err) {
    const detalhe = (err instanceof Error ? err.message : String(err)).replace(/\s+/g, ' ').slice(0, 250)
    console.error(`[consulta] #${consulta.id} falhou:`, err)
    await dizerAoResponsavel(`❌ Não consegui enviar a resposta da consulta #${consulta.id}: ${detalhe}. Ela continua pendente.`)
  }
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
// silencioso = pendente antigo: se o agente for transferir, NÃO manda de novo "vou transferir" pra aluna
// (ela já ouviu isso) — só abre a consulta pro responsável. Se ele souber responder, responde.
async function processarEntrada(phone: string, waMessageId: string | null, silencioso = false) {
  if (waMessageId) {
    await esperar(ESPERA_AGRUPAR_MS)
    if ((await ultimaEntrada(phone)) !== waMessageId) return // chegou outra depois: ela responde tudo
  }

  const chat = await abrirChat(phone)
  if (chat.modoHumano) return

  // Trava anti-loop: do outro lado pode haver OUTRO robô (resposta automática com IA que devolve
  // o nosso texto — caso real em 10/10/2026). Aluna conversando rápido chega a 2–3 respostas em
  // poucos minutos; 4 respostas em 5 minutos é robô. Para em silêncio, sem mandar mais nada.
  if ((await respostasRecentes(phone, 5)) >= 4) {
    await passarParaHumano(phone, HORAS_PESSOA, 'possível robô do outro lado (respostas em rajada) — bot parou sozinho')
    if (TAG_TRANSFERIU) await etiquetar(phone, TAG_TRANSFERIU)
    return
  }

  const conversa = await historico(phone)
  const porEmail = chat.userId ? null : await vincularPorEmail(conversa)
  const userId = chat.userId ?? porEmail
  const perfil = userId ? await perfilDaAluna(userId, !porEmail) : null

  let decisao
  try {
    decisao = await decidirResposta({ perfil, conversa, agora: new Date().toISOString(), aprendizados: await aprendizadosAtivos() })
  } catch (err) {
    // O texto do erro vai junto: sem ele, uma pane do agente (chave, saldo, limite) só aparece
    // como "erro no agente" e ninguém sabe a causa (10/10/2026: 16 alunas sem resposta por horas).
    const detalhe = (err instanceof Error ? err.message : String(err)).replace(/\s+/g, ' ').slice(0, 300)
    console.error(`[whatsapp] agente falhou (${phone}):`, err)
    await passarParaHumano(phone, HORAS_HANDOFF, `erro no agente: ${detalhe}`)
    await avisarHumano(phone, perfil?.nome, `o agente deu erro ao responder — ${detalhe}`)
    return
  }

  if (decisao.texto && !(silencioso && decisao.tipo === 'humano')) {
    const envio = await sendZapiText({ phone, message: decisao.texto, delayTyping: 2 })
    if (envio.ok) {
      await registrarMensagem({ phone, direction: 'out', author: 'agent', body: decisao.texto, waMessageId: envio.messageId })
    } else {
      console.error(`[whatsapp] envio da resposta falhou (${phone}):`, envio.error)
    }
  }

  if (decisao.tipo === 'humano') {
    await passarParaHumano(phone, HORAS_HANDOFF, decisao.motivo)
    const ultimaFala = [...conversa].reverse().find((x) => x.autor === 'student')?.texto ?? ''
    await consultarResponsavel(phone, perfil?.nome, perfil?.idioma ?? '?', ultimaFala, decisao.motivo, decisao.consulta)
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
    const corpo = (await request.json().catch(() => null)) as { phone?: string; silencioso?: boolean } | null
    const alvo = corpo?.phone
    if (!alvo) return NextResponse.json({ error: 'phone obrigatório' }, { status: 400 })
    await voltarParaBot(alvo)
    after(() => processarEntrada(alvo, null, Boolean(corpo?.silencioso)))
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

  // Mensagem do RESPONSÁVEL (WhatsApp pessoal dele → número do suporte) = resposta a uma consulta,
  // nunca conversa de aluna.
  if (ehResponsavel(phone)) {
    if (m.text?.message) {
      const fala = m.text.message
      after(() => responderConsulta(fala, m.referenceMessageId))
    }
    return NextResponse.json({ ok: true, responsavel: true })
  }

  if (lid && !ehLid) await salvarLid(phone, lid)
  const nova = await registrarMensagem({ phone, direction: 'in', author: 'student', body: texto, waMessageId })
  if (nova) after(() => processarEntrada(phone, waMessageId))
  return NextResponse.json({ ok: true })
}
