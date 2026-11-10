import { NextRequest, NextResponse, after } from 'next/server'
import { etiquetar, marcarNaoLida, sendZapiText } from '@/lib/zapi'
import { acessoPendente, enfileirar, jaEnfileirou, marcarNaFila, pediuParaParar, registrarPedidoParaParar } from '@/lib/whatsapp-outbox'
import { conviteDepoimento } from '@/lib/whatsapp-agent/depoimentos'
import { ofertaPase } from '@/lib/whatsapp-agent/pase'
import { darCardapioBonus } from '@/lib/diet/quota'
import { creditarIndicacao, textoIndicacaoFalhou } from '@/lib/whatsapp-agent/indicacao'
import { foiConvidadaParaVideo, receberVideo } from '@/lib/video-depoimento'
import { conviteHotmartDela, liberarPresenteHotmart, marcarDepoimentoNoPost, marcarProvaSocial } from '@/lib/whatsapp-agent/prova-social'
import { contaPelaCompraHotmart, reenviarAcesso, reenvioRecente, trocarEmail, emailsDaConta, textoVamosVer, textoOlvidaste, KIND_EMAIL_TROCADO } from '@/lib/whatsapp-agent/acesso'
import { tratarComando } from '@/lib/whatsapp-agent/comandos'
import { decidirResposta, redigirRespostaAprovada, interpretarRespostaResponsavel, type Consulta } from '@/lib/whatsapp-agent/responder'
import {
  abrirChat,
  aprendizadosAtivos,
  consultaPorAlerta,
  consultaPorId,
  consultaPendenteDoChat,
  consultasPendentes,
  criarConsulta,
  fecharConsulta,
  admin,
  marcarAlertaDaConsulta,
  salvarAprendizado,
  type ConsultaAberta,
  historico,
  mensagemJaRegistrada,
  passarParaHumano,
  perfilDaAluna,
  registrarMensagem,
  pareceRobo,
  respostasRecentes,
  salvarLid,
  telefoneDoLid,
  ultimaEntrada,
  vincularPorEmail,
  voltarParaBot,
  emailDaConta,
} from '@/lib/whatsapp-agent/conversa'
import { blocoHotmart } from '@/lib/whatsapp-agent/dinheiro'
import { reembolsosPendentes, aprovarReembolsos, criarPedidosDaDecisao } from '@/lib/whatsapp-agent/reembolsos'
import { emailNaConversa } from '@/lib/whatsapp-agent/dinheiro'
import { reembolsarStripe } from '@/lib/stripe-api'

/** Resposta imediata ao pedido de reembolso da Stripe (texto do [Alunas Stripe], 09/11). Sem "devolvido". */
function textoReembolsoStripe(idioma: string, nome: string | undefined, ok: boolean): string {
  const n = nome?.trim().split(/\s+/)[0]
  const pl = idioma === 'pl'
  if (!ok) return pl
    ? `${n ? `${n}, t` : 'T'}woja prośba o zwrot jest zapisana. Nasz zespół sprawdza to teraz i napiszemy do Ciebie tutaj. 💛`
    : `${n ? `${n}, y` : 'Y'}our refund request is registered. Our team is checking it now and we'll write to you here. 💛`
  return pl
    ? `Jasne${n ? `, ${n}` : ''}. Twój zwrot jest już w trakcie realizacji — nie musisz nic więcej robić. Wszystkie informacje znajdziesz tutaj:\nhttps://riseme.app/pl/refund\nGdy zwrot zostanie zrealizowany, wyślę Ci tutaj potwierdzenie. 💛`
    : `Of course${n ? `, ${n}` : ''}. Your refund is already being processed — you don't need to do anything else. All the details are here:\nhttps://riseme.app/en/refund\nOnce the refund is completed, I'll send you a confirmation here. 💛`
}

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
  reaction?: { value?: string; referencedMessage?: { messageId?: string; fromMe?: boolean } }
  video?: { caption?: string; videoUrl?: string }
  document?: { fileName?: string }
  sticker?: unknown
  participantPhone?: string
  pollVote?: { pollMessageId?: string; options?: { name?: string }[] }
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
  // Com URL o vídeo é guardado (depoimento em vídeo, lib/video-depoimento.ts); o agente não assiste, só sabe que chegou.
  if (m.video) {
    const legenda = m.video.caption ? ` Legenda: ${m.video.caption}` : ''
    return m.video.videoUrl ? `[VÍDEO: ${m.video.videoUrl}]${legenda}` : `[a aluna mandou um VÍDEO]${legenda}`
  }
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

// O que não pode esperar a lista das 20h: avisa na hora (chargeback/ameaça, erro do sistema, pedido explícito de urgência).
const URGENTE = /chargeback|contesta|disput|denunc|amea[çc]|urgente|fraude|golpe|estafa/i

// Transferência = CONSULTA: quem é, o que disse, o resumo e 2 respostas possíveis. Desde 05/11/2026 a consulta comum
// nasce em silêncio e entra na LISTA DAS 20H (lib/whatsapp-agent/lista-20h.ts); a aluna ouviu "te respondo hoy hasta las
// 20h". Só a urgente avisa na hora. O responsável responde "#id A", "#id B", texto livre ou "pular" — ver responderConsulta.
async function consultarResponsavel(phone: string, nome: string | undefined, idioma: string, ultimaFala: string, motivo: string, c: Consulta) {
  // Já há consulta aberta desta conversa (últimas 24 h): não abre outra a cada mensagem dela.
  if (await consultaPendenteDoChat(phone)) return
  const id = await criarConsulta({ ...c, phone, nome, motivo })
  if (!id) return avisarHumano(phone, nome, motivo) // tabela indisponível → aviso simples, como antes
  if (!URGENTE.test(motivo)) {
    console.log(`[consulta] #${id} aberta para a lista das 20h (${nome ?? 'sem conta'}, ${phone}): ${motivo}`)
    return
  }
  const fala = ultimaFala.replace(/\[IMAGEM: [^\]]+\]/g, '[imagem]').slice(0, 400)
  const msg = [
    `🔴 *Consulta URGENTE #${id}* — ${nome ?? 'Aluna sem conta'} (${idioma}) +${phone.replace('@lid', ' · sem número')}`,
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
    consulta = await consultaPorId(Number(porId[1])) // vale também para as antigas (fora das 48 h)
    if (consulta) corpo = corpo.slice(porId[0].length).trim()
  }
  if (!consulta && pendentes.length === 1) consulta = pendentes[0]
  if (!consulta) {
    await dizerAoResponsavel(
      pendentes.length
        ? `Não sei de qual consulta é essa resposta. Abertas agora:\n${pendentes.map((p) => `• #${p.id} — ${p.nome ?? 'aluna sem conta'}: ${p.resumo.slice(0, 70)}…`).join('\n')}\n\nResponda *citando* a mensagem da consulta, ou comece com o número: "#${pendentes[pendentes.length - 1].id} A". Para os reembolsos da lista: "ok 1 2", "ok todos" ou "não 2".`
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
  // Sem interpretar aqui: "A", "B)", "resposta B", "A, mas pede o email"… quem entende é o redator,
  // que recebe as duas opções junto (13/10/2026: comparar com 'a'/'b' exatos falhava em quase tudo).
  const orientacao = corpo
  if (!orientacao) {
    await dizerAoResponsavel(`Não entendi a resposta da consulta #${consulta.id}. Escreva A, B ou o que responder.`)
    return
  }

  try {
    const chat = await abrirChat(consulta.phone)
    const conversa = await historico(consulta.phone)
    const porEmail = chat.userId ? null : await vincularPorEmail(conversa)
    const userId = chat.userId ?? porEmail
    const perfil = userId ? await perfilDaAluna(userId, !porEmail, consulta.phone) : null
    const { enviar, nota, mensagem, aprendizado } = await redigirRespostaAprovada({
      perfil,
      conversa,
      resumo: consulta.resumo,
      opcaoA: consulta.opcaoA,
      opcaoB: consulta.opcaoB,
      orientacao,
    })
    if (!enviar) {
      // Orientação era pergunta/pedido de ação: nada vai para a aluna, a consulta segue pendente.
      await dizerAoResponsavel(`✋ Consulta #${consulta.id} — não enviei nada para a aluna.\n${nota || 'Não ficou claro o que responder a ela.'}\n\nQuando decidir, responda de novo citando a consulta.`)
      return
    }
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
  // o nosso texto — caso real em 10/10/2026). Com 4 em 5 min ela calou 10 alunas DE VERDADE em 13–16/10
  // (gente que escreve em rajada: Lupe chamou "Hello?" 4x por 1h); 8 em 10 min ainda calou Yadira e Madeleine
  // (17–18/10). Agora o sinal é o TEMPO: robô responde em segundos (pareceRobo). Teto de volume só de segurança.
  // Quem trava avisa o responsável — nunca silêncio sem ninguém saber.
  if ((await pareceRobo(phone)) || (await respostasRecentes(phone, 10)) >= 20) {
    await passarParaHumano(phone, HORAS_PESSOA, 'possível robô do outro lado (respostas em segundos) — bot parou sozinho')
    if (TAG_TRANSFERIU) await etiquetar(phone, TAG_TRANSFERIU)
    await avisarHumano(phone, undefined, 'o bot parou nesta conversa (respostas em segundos — robô do outro lado?). Confira; se for aluna, responda.')
    return
  }

  const conversa = await historico(phone)
  const porEmail = chat.userId ? null : await vincularPorEmail(conversa)
  // Número sem conta: aluna antiga do convite Hotmart (dados na fila; 27/10/2026) OU qualquer compradora que mandou o
  // e-mail da compra → a Hotmart confirma a compra paga e a conta nasce agora, com o acesso saindo nesta conversa
  // (autosserviço, lib/whatsapp-agent/acesso.ts, 05/11/2026). Sem compra paga → o agente recebe o e-mail e o bloco HOTMART.
  const ultimaDela = [...conversa].reverse().find((m) => m.autor === 'student')?.texto ?? ''
  const criada = chat.userId || porEmail || /^\s*(no|stop|baja)\W*$/i.test(ultimaDela) || (await pediuParaParar(phone))
    ? null
    : await contaPelaCompraHotmart({ phone, conversa })
  const userId = chat.userId ?? porEmail ?? criada?.userId ?? null
  const semCompra = criada && criada.userId === null ? criada.semCompra : null
  const perfil = userId ? await perfilDaAluna(userId, !porEmail, phone) : null
  if (perfil) {
    // Escreveu antes de o acesso sair (ele espera ~15 min de propósito): o agente precisa saber (caso Madeleine, 18/10).
    perfil.acessoAgendadoEm = await acessoPendente(phone)
    perfil.reenvioRecente = await reenvioRecente(phone)
    if (criada?.userId && criada.criadaAgora) {
      perfil.contaCriadaAgora = true
      if (criada.compradaEm) {
        perfil.compradaEm = criada.compradaEm
        perfil.compraAntiga = Date.now() - new Date(criada.compradaEm).getTime() > 2 * 86_400_000
      }
      await dizerAoResponsavel(`👤 Conta criada pelo bot pela compra Hotmart — ${criada.email} (+${phone.replace('@lid', '')}): ${criada.produto}; acesso saindo nesta conversa.`)
    }
  }

  // Depoimento em VÍDEO (21/10): vídeo novo (depois da nossa última fala) → guarda, dá os 3 meses do Pase a quem foi
  // convidada e manda o link ao responsável. O agente só agradece e pede a autorização de uso.
  const ultimaNossa = conversa.reduce((ix, m, i) => (m.autor !== 'student' ? i : ix), -1)
  const urlVideo = conversa.slice(ultimaNossa + 1).map((m) => m.texto.match(/\[VÍDEO: (\S+)\]/)?.[1]).find(Boolean)
  if (urlVideo) {
    try {
      const convidada = await foiConvidadaParaVideo(phone, userId)
      const v = await receberVideo({ phone, userId, url: urlVideo, darPresente: convidada })
      if (perfil) perfil.videoDepoimento = v.resultado
      await dizerAoResponsavel(`🎥 Depoimento em VÍDEO — ${perfil?.nome ?? 'aluna sem conta'} (+${phone.replace('@lid', '')})\nPresente: ${v.resultado}${v.link ? `\nBaixar (30 dias): ${v.link}` : ''}`)
    } catch (err) {
      console.error(`[video-depoimento] falhou (${phone}):`, err)
    }
  }

  let decisao: Awaited<ReturnType<typeof decidirResposta>>
  try {
    const conviteHotmart = await conviteHotmartDela(phone).catch(() => null)
    const conviteVideo = await foiConvidadaParaVideo(phone, userId).catch(() => false)
    // Assunto de dinheiro: consulta a Hotmart pelo e-mail (da conta ou o que ela digitou) e entrega como fato (04/11/2026).
    const hotmart = semCompra ? semCompra.bloco : await blocoHotmart(conversa, userId ? await emailsDaConta(userId) : null).catch(() => null)
    // Reprocessamento de pendente: o agente recebe a consulta aberta como a pergunta a responder (05/11/2026; antes respondia ao "gracias").
    const consultaPendente = silencioso ? await admin().from('whatsapp_consultas').select('id, resumo, motivo, created_at').eq('phone', phone).eq('status', 'pendente').order('created_at', { ascending: false }).limit(1).then((r) => (r.data?.[0] ? { id: r.data[0].id, resumo: r.data[0].resumo, motivo: r.data[0].motivo, desde: r.data[0].created_at } : null)) : null
    // Assunto de dinheiro no reprocessamento: a consulta pendente conta como sinal (a conversa pode ter esfriado).
    const hotmartSilencioso = consultaPendente && /cobr|reembols|dinheiro|duplic|assinatura|cancel/i.test(consultaPendente.motivo) && userId ? await blocoHotmart([...conversa, { autor: 'student', texto: consultaPendente.motivo, em: new Date().toISOString() }], await emailsDaConta(userId)).catch(() => null) : null
    const emailsParaHotmart = userId ? await emailsDaConta(userId) : [emailNaConversa(conversa)].filter((e): e is string => Boolean(e))
    decisao = await decidirResposta({ phone, perfil, conversa, agora: new Date().toISOString(), aprendizados: await aprendizadosAtivos(), conviteHotmart, conviteVideo, hotmart: hotmart ?? hotmartSilencioso, emailSemConta: semCompra?.email, consultaPendente, buscarHotmart: emailsParaHotmart.length ? () => blocoHotmart(conversa, emailsParaHotmart, { forcar: true }) : undefined })
  } catch (err) {
    // O texto do erro vai junto: sem ele, uma pane do agente (chave, saldo, limite) só aparece
    // como "erro no agente" e ninguém sabe a causa (10/10/2026: 16 alunas sem resposta por horas).
    const detalhe = (err instanceof Error ? err.message : String(err)).replace(/\s+/g, ' ').slice(0, 300)
    console.error(`[whatsapp] agente falhou (${phone}):`, err)
    await passarParaHumano(phone, HORAS_HANDOFF, `erro no agente: ${detalhe}`)
    await avisarHumano(phone, perfil?.nome, `o agente deu erro ao responder — ${detalhe}`)
    return
  }

  // Ela mandou outra mensagem enquanto o agente pensava (10–20 s): esta resposta já nasceu velha e a
  // da mensagem nova (que lê o histórico todo) vai sair também — 2 respostas seguidas, uma desatualizada.
  // Descarta; a próxima rodada responde tudo. Casos reais: "Hola de nuevo…" + "Claro, te leo…" (15/10).
  if (waMessageId && (await ultimaEntrada(phone)) !== waMessageId) return

  // Brinde do depoimento: ela mandou o print → libera na hora, ANTES de mandar a resposta (que diz "já
  // está liberado"). Vale conta achada pelo telefone ou pelo email que ela mandou (Bruno, 15/10: "não trava").
  // Sem conta o agente pede o email e não marca liberar_brinde. Se o sistema falhar, vira consulta.
  if (decisao.tipo === 'responder' && decisao.liberarBrinde) {
    let liberou = false
    try {
      if (userId) {
        const novo = await darCardapioBonus(userId, 'depoimento') // false = já tinha; a resposta cobre os dois casos
        liberou = true
        // Métrica do depoimento: print + brinde entregue (linha inerte na fila, só para contar).
        if (novo) await marcarNaFila(phone, 'brinde-depoimento')
        await marcarDepoimentoNoPost(phone).catch(() => {})
      }
    } catch (err) {
      console.error(`[depoimento] brinde falhou (${phone}):`, err)
    }
    if (!liberou && !userId) {
      // Sem conta achada: pedir o email (antes virava consulta com texto vazio = aluna no vácuo, 6 casos em 13–16/10).
      decisao = { tipo: 'responder', texto: pedirEmailDoBrinde(phone), pedirDepoimento: false, liberarBrinde: false, pararMensagens: false }
    } else if (!liberou) {
      decisao = {
        tipo: 'humano',
        texto: '',
        motivo: 'aluna mandou o print do depoimento mas o brinde não pôde ser liberado sozinho',
        consulta: {
          resumo: 'Ela comentou e mandou o print para ganhar o cardápio extra, mas o sistema não conseguiu liberar (conta não encontrada ou erro).',
          opcaoA: 'Obrigada pelo comentário! Já liberei seu cardápio extra, está na aba do cardápio no app.',
          opcaoB: 'Obrigada pelo comentário! Me passa o email da sua compra para eu liberar seu cardápio extra.',
        },
      }
    }
  }

  // Indicação: a amiga comprou e ela mandou o email da amiga → 1 mês do Pase (lib/whatsapp-agent/indicacao.ts).
  // Confere ANTES de enviar: a resposta do agente assume que deu certo; se não deu, troca pelo texto do motivo.
  if (decisao.tipo === 'responder' && decisao.indicacaoEmail) {
    const idioma = perfil?.idioma ?? (phone.startsWith('48') ? 'pl' : 'es')
    try {
      if (!userId) decisao = { ...decisao, texto: textoIndicacaoFalhou('sem-conta', idioma) }
      else {
        const r = await creditarIndicacao(userId, decisao.indicacaoEmail)
        if (r !== 'ok') decisao = { ...decisao, texto: textoIndicacaoFalhou(r, idioma) }
        else await marcarNaFila(phone, 'indicacao-presente') // métrica (linha inerte)
      }
    } catch (err) {
      console.error(`[indicacao] falhou (${phone}):`, err)
      decisao = {
        tipo: 'humano',
        texto: '',
        motivo: `indicação: não consegui liberar o Pase (amiga ${decisao.indicacaoEmail})`,
        consulta: { resumo: `Aluna indicou uma amiga que comprou (${decisao.indicacaoEmail}); o sistema falhou ao liberar 1 mês do Pase.`, opcaoA: 'Liberar 1 mês do Pase à mão e avisar a aluna.', opcaoB: 'Pedir o email exato com que a amiga comprou.' },
      }
    }
  }

  // Presente do convite às alunas da área de membros Hotmart (Bruno, 26/10): mandou o depoimento e escolheu o
  // desafio → libera ANTES de enviar (a resposta do agente já diz que está liberado). Falhou → avisa e vira consulta.
  if (decisao.tipo === 'responder' && decisao.presenteDesafio) {
    // 28/10: ela escreveu "Pos parto" e saiu o Preparto (6). O que ela escreveu vence o id do modelo.
    const falaDela = conversa.slice(ultimaNossa + 1).map((m) => m.texto).join(' ')
    if (decisao.presenteDesafio === '6' && /p[oó]s\s*t?\s*-?\s*parto|despu[eé]s del parto/i.test(falaDela) && !/pre\s*-?\s*parto|embaraz/i.test(falaDela)) {
      decisao.presenteDesafio = '7'
      decisao.texto = decisao.texto.replaceAll('Preparto', 'Posparto')
    }
    const r = await liberarPresenteHotmart({ phone, userId, desafio: decisao.presenteDesafio })
    await dizerAoResponsavel(`🎁 Presente do depoimento (Hotmart) — ${perfil?.nome ?? 'aluna'} (+${phone.replace('@lid', '')}): desafio ${decisao.presenteDesafio} → ${r}`)
    if (r === 'sem-dados' || r === 'erro') {
      decisao = {
        tipo: 'humano',
        texto: '¡Muchas gracias! 💛 Voy a revisar tu correo aquí y enseguida te libero todo. Si no lo encuentro, te escribo para pedirte otro correo.',
        motivo: `PRESENTE DEPOIMENTO HOTMART — liberar desafio ${decisao.presenteDesafio} (vitalício): o sistema não achou a conta/compra (${r})`,
        consulta: { resumo: `Aluna do convite Hotmart mandou o depoimento e escolheu o desafio ${decisao.presenteDesafio}; o sistema não conseguiu liberar (${r}).`, opcaoA: 'Achar a conta/compra e liberar o desafio.', opcaoB: 'Pedir a ela o email da compra.' },
      }
    }
  }

  // Prova social (foto de resultado, vídeo, depoimento escrito) → etiqueta no WhatsApp + registro para achar depois.
  if (urlVideo || (decisao.tipo === 'responder' && decisao.provaSocial)) {
    const dela = conversa.slice(ultimaNossa + 1).map((m) => m.texto).join(' / ')
    await marcarProvaSocial(phone, dela).catch((err) => console.error(`[prova-social] falhou (${phone}):`, err))
  }

  // Pase por um ano no lugar do reembolso (Bruno 06/11/2026): ela aceitou a troca → acesso entra agora e os pedidos de
  // reembolso dela que aguardavam o "ok" saem da lista. Sem conta: vira consulta.
  if (decisao.tipo === 'responder' && decisao.paseEmVezDeReembolso) {
    const { darPaseUmAno, cancelarReembolsosPendentesDela } = await import('@/lib/whatsapp-agent/pase-presente')
    const r = userId ? await darPaseUmAno({ userId, phone, origem: `recomenda-${phone.replace('@lid', '')}-${Date.now()}` }) : 'sem-conta'
    const cancelados = r === 'liberado' || r === 'ja-tinha' ? await cancelarReembolsosPendentesDela(phone) : 0
    await dizerAoResponsavel(`🎁 Pase por 1 ano no lugar do reembolso — ${perfil?.nome ?? 'aluna'} (+${phone.replace('@lid', '')}): ${r}${cancelados ? `; ${cancelados} pedido(s) de reembolso cancelado(s)` : ''}`)
    if (r === 'erro' || r === 'sem-conta') {
      decisao = {
        tipo: 'humano',
        texto: decisao.texto,
        motivo: `PASE NO LUGAR DO REEMBOLSO — a aluna aceitou e o sistema não conseguiu liberar (${r})`,
        consulta: { resumo: `Aluna aceitou o Pase por um ano no lugar do reembolso; o sistema não liberou (${r}).`, opcaoA: 'Liberar o Pase à mão (subscriptions + user_challenges) e avisar.', opcaoB: 'Pedir o e-mail da conta.' },
      }
    }
  }

  // Reembolso decidido pelo bot (2º pedido, compra paga até 15 dias, bloco HOTMART): vira pedido aguardando o "ok" do
  // responsável (lista das 20h, ou na hora se estiver perto do dia 15). Sem pedido criado → vira consulta (05/11/2026).
  // Compra da Stripe (Bruno 09/11/2026, teste CL-PL; zero chargeback): reembolso AUTOMÁTICO, sem lista nem aprovação.
  // O texto é fixo (nunca "devolvido"); a confirmação final, com o presente do acesso, sai pelo webhook da Stripe.
  if (decisao.tipo === 'responder' && decisao.reembolsoTransacoes?.some((t) => t.startsWith('pi_'))) {
    const pis = decisao.reembolsoTransacoes.filter((t) => t.startsWith('pi_'))
    const idioma = perfil?.idioma ?? 'pl'
    const res = await Promise.all(pis.map((pi) => reembolsarStripe({ paymentIntent: pi, origem: 'aluna-whatsapp' }).catch((err) => ({ ok: false as const, erro: String(err) }))))
    const falhas = res.map((r, i) => (r.ok ? null : `${pis[i]}: ${r.erro}`)).filter(Boolean)
    decisao = { ...decisao, texto: textoReembolsoStripe(idioma, perfil?.nome, falhas.length === 0), reembolsoTransacoes: decisao.reembolsoTransacoes.filter((t) => !t.startsWith('pi_')) }
    if (falhas.length) await avisarHumano(phone, perfil?.nome, `REEMBOLSO STRIPE falhou (${falhas.join('; ')}) — conferir no painel da Stripe`).catch(() => {})
    console.log(`[stripe] reembolso pedido pelo WhatsApp ${phone}: ${pis.join(', ')}${falhas.length ? ` (FALHOU: ${falhas.join('; ')})` : ''}`)
  }

  if (decisao.tipo === 'responder' && decisao.reembolsoTransacoes?.length) {
    const txs = decisao.reembolsoTransacoes
    const motivoReembolso = decisao.reembolsoMotivo ?? ''
    const textoBot = decisao.texto
    const email = (userId ? await emailDaConta(userId) : null) ?? emailNaConversa(conversa)
    const r = email
      ? await criarPedidosDaDecisao({ phone, nome: perfil?.nome ?? '', idioma: perfil?.idioma ?? 'es', email, transacoes: txs, motivo: motivoReembolso }).catch((err) => ({ criados: [] as string[], ignorados: txs, urgente: false, erro: String(err) }))
      : { criados: [] as string[], ignorados: txs, urgente: false }
    if (!r.criados.length) {
      decisao = {
        tipo: 'humano',
        texto: textoBot,
        motivo: `REEMBOLSO — o bot quis registrar ${txs.join(', ')} mas não achou compra paga na Hotmart${'erro' in r ? ` (${r.erro})` : ''}`,
        consulta: { resumo: `Aluna pediu reembolso (${motivoReembolso || 'sem motivo'}); transações ${txs.join(', ')} não confirmadas na Hotmart.`, opcaoA: 'Conferir na Hotmart e reembolsar no painel.', opcaoB: 'Pedir a ela o e-mail/transação da compra.' },
      }
    } else {
      console.log(`[reembolsos] pedido(s) criado(s) para ${phone}: ${r.criados.join(', ')}${r.urgente ? ' (URGENTE, lista enviada)' : ''}`)
    }
  }

  // Feedback da aluna sobre aulas/app (Bruno 05/11/2026): fica registrado (kind 'feedback-aluna') para a revisão semanal e o backlog.
  if (decisao.tipo === 'responder' && decisao.feedbackResumo) {
    await marcarNaFila(phone, 'feedback-aluna', decisao.feedbackResumo.slice(0, 400)).catch((err) => console.error(`[feedback] registro falhou (${phone}):`, err))
  }

  // Autosserviço de acesso (05/11/2026, lib/whatsapp-agent/acesso.ts): e-mail corrigido ANTES de enviar (a resposta já diz
  // que trocou); senha renovada DEPOIS do texto (a mensagem de acesso chega em seguida). Só conta confirmada pelo telefone.
  let reenviarDepois: string | null = null // e-mail com que o acesso novo sai
  // Transferiu por causa do e-mail/senha mas o texto afirma que já trocou/renovou (teste 05/11): troca pelo texto neutro.
  if (decisao.tipo === 'humano' && /e-?mail|senha|acesso/i.test(decisao.motivo) && /cambi(amos|ado|é)|renov(amos|ada)|ya (te )?(llega|quedó)|zmieni|odnowi|changed|renewed/i.test(decisao.texto)) {
    decisao = { ...decisao, texto: textoVamosVer(perfil?.idioma ?? 'es') }
  }
  if (decisao.tipo === 'responder' && (decisao.novoEmail || decisao.reenviarAcesso)) {
    const idioma = perfil?.idioma ?? 'es'
    const pedido = decisao.novoEmail ? `trocar o e-mail para ${decisao.novoEmail}` : 'renovar a senha'
    if (!userId || !perfil?.confirmadaPorTelefone) {
      // O prompt não deveria marcar sem conta confirmada; segurança em profundidade (qualquer um digita um e-mail).
      decisao = decisao.novoEmail
        ? { tipo: 'humano', texto: textoVamosVer(idioma), motivo: `ACESSO — pediu ${pedido}, mas a conta não é confirmada pelo telefone`, consulta: { resumo: `Aluna (conta achada só pelo e-mail digitado, ou sem conta) pediu ${pedido}.`, opcaoA: 'Confirmar que é ela (e-mail e telefone da compra na Hotmart) e fazer a troca.', opcaoB: 'Pedir que escreva do telefone da compra ou use "¿Olvidaste tu contraseña?".' } }
        : { ...decisao, texto: textoOlvidaste(idioma), reenviarAcesso: false }
    } else {
      const emailAtual = (await emailDaConta(userId)) ?? ''
      if (decisao.novoEmail) {
        const r = await trocarEmail({ userId, atual: emailAtual, novo: decisao.novoEmail })
        if (r.ok) {
          reenviarDepois = decisao.novoEmail
          await marcarNaFila(phone, KIND_EMAIL_TROCADO, `${emailAtual} → ${decisao.novoEmail}`)
          console.log(`[acesso] e-mail trocado pelo bot (${phone}): ${emailAtual} → ${decisao.novoEmail}`)
        } else {
          decisao = { tipo: 'humano', texto: textoVamosVer(idioma), motivo: `TROCA DE E-MAIL pelo bot falhou (${r.erro}): ${emailAtual} → ${decisao.novoEmail}`, consulta: { resumo: `Aluna confirmou o e-mail novo ${decisao.novoEmail} (atual ${emailAtual}); o sistema não trocou: ${r.erro === 'ja-existe' ? 'já existe outra conta com esse e-mail' : r.erro}.`, opcaoA: 'Juntar/trocar à mão e avisar que o acesso novo sai aqui.', opcaoB: 'Pedir outro e-mail a ela.' } }
        }
      } else if (decisao.reenviarAcesso && !perfil.reenvioRecente) {
        reenviarDepois = emailAtual
      }
    }
  }

  // Reprocessamento de pendente antigo (silencioso): a aluna NÃO escreveu agora. Só sai mensagem se for a resposta de
  // verdade à consulta; "sigue con el equipo", "💛", "con gusto" ficam no servidor. (05/11/2026 à noite: Giovanna, que
  // perguntou do ombro em 01/11, recebeu 4 mensagens vazias em 47 min, à 1h da manhã na Espanha.)
  const evasiva = /est[aá] con el equipo|con el sector|te respondemos|respondemos por aqu|sigue con|lo revisamos|te escribo (mañana|hoy)|hasta las 20|perdona la espera|jest już u|zespo[łl]em/i
  const respostaDeVerdade = Boolean(decisao.texto) && decisao.tipo !== 'humano' && decisao.texto.length > 80 && !evasiva.test(decisao.texto)
  if (silencioso && !respostaDeVerdade) {
    console.log(`[reprocessar] ${phone}: sem resposta de verdade (${decisao.tipo}, ${decisao.texto?.length ?? 0} chars) — nada enviado, consulta segue pendente`)
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

  if (reenviarDepois && userId) {
    try {
      await reenviarAcesso({ userId, phone, email: reenviarDepois, idioma: perfil?.idioma ?? 'es' })
    } catch (err) {
      const detalhe = (err instanceof Error ? err.message : String(err)).slice(0, 200)
      console.error(`[acesso] reenvio pelo bot falhou (${phone}):`, err)
      await consultarResponsavel(phone, perfil?.nome, perfil?.idioma ?? '?', ultimaDela, `ACESSO — o bot prometeu o acesso novo (${reenviarDepois}) e o envio falhou: ${detalhe}`, { resumo: `O bot disse à aluna que a senha foi renovada e o acesso chegaria aqui, mas o envio falhou (${detalhe}).`, opcaoA: 'Reenviar o acesso (comando "reenvia o acesso de <e-mail>").', opcaoB: 'Pedir que use "¿Olvidaste tu contraseña?" no login.' })
    }
  }

  if (decisao.tipo === 'humano') {
    // NÃO cala o bot: transferir é abrir a consulta, não deixar a aluna no vácuo. Se ela mandar outra
    // coisa, o agente responde o que souber (caso real 14/10: "¿qué es vitalicio?" ficou 12 min sem
    // resposta porque o bot tinha transferido). Só pessoa respondendo pelo celular cala o bot.
    const ultimaFala = [...conversa].reverse().find((x) => x.autor === 'student')?.texto ?? ''
    await consultarResponsavel(phone, perfil?.nome, perfil?.idioma ?? '?', ultimaFala, decisao.motivo, decisao.consulta)
    if (TAG_TRANSFERIU) await etiquetar(phone, TAG_TRANSFERIU)
    if (TAG_RESPONDEU) await etiquetar(phone, TAG_RESPONDEU, 'remove')
    await marcarNaoLida(phone)
  } else {
    if (TAG_RESPONDEU) {
      await etiquetar(phone, TAG_RESPONDEU)
      if (TAG_TRANSFERIU) await etiquetar(phone, TAG_TRANSFERIU, 'remove')
    }
    if (decisao.pararMensagens) await registrarPedidoParaParar(phone)
    else if (decisao.pedirDepoimento && !silencioso) await ofertasPosConversa(phone, perfil?.idioma ?? 'es', userId, Boolean(porEmail))
    // Reprocessamento de pendente antigo (05/11/2026): o bot respondeu sozinho com as capacidades novas (Hotmart, acesso, catálogo,
    // acervo) → a consulta sai da lista do responsável, com a resposta registrada; ele recebe uma linha.
    // Só fecha se respondeu de verdade: não quando empurra ('ya está con el equipo', 'te respondemos', 'sigue con') nem quando é curta.
    if (silencioso && respostaDeVerdade) {
      const { data: abertas } = await admin().from('whatsapp_consultas').select('id').eq('phone', phone).eq('status', 'pendente')
      for (const c of abertas ?? []) {
        await fecharConsulta(c.id, { status: 'respondida', orientacao: 'bot respondeu sozinho (reprocessado)', respostaEnviada: decisao.texto })
        await dizerAoResponsavel(`✅ Consulta #${c.id} resolvida pelo bot (reprocessada) — ${perfil?.nome ?? 'aluna'}:\n«${decisao.texto.slice(0, 300)}»`)
      }
    }
  }
}

// Pedido do email quando o print chegou mas a conta não foi achada — idioma pelo DDI (sem perfil não há outro).
function pedirEmailDoBrinde(phone: string): string {
  if (phone.startsWith('48')) return 'Dziękuję za komentarz! 💛\n\nŻeby odblokować Ci dodatkowy jadłospis, napisz mi proszę e-mail, którego użyłaś przy zakupie.'
  if (phone.startsWith('90')) return 'Yorumun için çok teşekkürler! 💛\n\nEkstra menünü açabilmem için satın alırken kullandığın e-postayı yazar mısın?'
  return '¡Muchas gracias por tu comentario! 💛\n\nPara liberarte el menú extra, ¿me escribes el correo que usaste en la compra?'
}

// Conversa terminou bem (agente marcou, ou ela reagiu com ❤️/👍 a uma mensagem nossa):
// pedido de depoimento (links/texto em lib/whatsapp-agent/depoimentos.ts) e, no mesmo gatilho, a oferta
// do teste grátis do Pase (regras em lib/whatsapp-agent/pase.ts). Cada um 1x por aluna; nunca juntos.
async function ofertasPosConversa(phone: string, idioma: string, userId: string | null, porEmail: boolean) {
  if (await pediuParaParar(phone)) return
  let depoimentoAgora = false
  const convite = conviteDepoimento(idioma, phone)
  if (convite && !(await jaEnfileirou(phone, 'depoimento'))) {
    await enfileirar({ phone, kind: 'depoimento', body: convite, sendAfter: new Date(Date.now() + 60_000) })
    depoimentoAgora = true
  }
  try {
    if (userId && !porEmail && !(await jaEnfileirou(phone, 'pase'))) {
      const oferta = await ofertaPase(userId, idioma)
      if (oferta) {
        const espera = depoimentoAgora ? 24 * 3600_000 : 2 * 60_000
        await enfileirar({ phone, kind: 'pase', body: oferta, sendAfter: new Date(Date.now() + espera) })
      }
    }
  } catch (err) {
    console.error(`[pase] oferta do suporte falhou (${phone}):`, err)
  }
}

// Reação a uma mensagem NOSSA. Positiva (❤️ 👍 🙏 😍 …) = ela ficou de boa → mesmas ofertas do
// "terminou bem", sem chamar o agente. Só se nada estiver pendente (pessoa no atendimento ou consulta aberta).
const REACOES_POSITIVAS = ['❤', '♥', '💛', '💖', '💕', '💗', '😍', '🥰', '😘', '👍', '🙏', '👏', '😊', '☺', '🙌', '💪', '🔥', '✨', '😁', '😀', '🤩', '💯', '✅']
async function processarReacao(phone: string, emoji: string) {
  if (!REACOES_POSITIVAS.some((r) => emoji.includes(r))) return
  const chat = await abrirChat(phone)
  if (chat.modoHumano || (await consultaPendenteDoChat(phone))) return
  const perfil = chat.userId ? await perfilDaAluna(chat.userId) : null
  await ofertasPosConversa(phone, perfil?.idioma ?? 'es', chat.userId, false)
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

  // Voto em enquete (grupo da comunidade, Bruno 10/11/2026): só GUARDA quem votou e em quê (kind 'enquete-voto'), nunca responde.
  // Antes os votos eram descartados com o resto do grupo e só dava para ler no celular.
  if (m.type === 'ReceivedCallback' && m.pollVote && !m.fromMe) {
    const quem = (m.participantPhone ?? m.participantLid ?? m.phone ?? '').replace(/[^\d@lid]/g, '') || 'desconhecido'
    const voto = { grupo: m.phone ?? null, enquete: m.pollVote.pollMessageId ?? null, opcoes: (m.pollVote.options ?? []).map((o) => o.name ?? ''), nome: m.senderName ?? null }
    await marcarNaFila(quem, 'enquete-voto', JSON.stringify(voto)).catch((err) => console.error('[enquete] voto não gravado:', err))
    return NextResponse.json({ ok: true, enquete: 'voto registrado' })
  }

  if (m.type !== 'ReceivedCallback' || m.isGroup || m.isNewsletter || m.broadcast || m.isStatusReply) {
    return NextResponse.json({ ok: true, skipped: 'not a direct message' })
  }
  // phone pode vir como telefone ("5511…") ou como LID ("1453…@lid"); chatLid é o LID estável.
  const ehLid = (m.phone ?? '').includes('@lid')
  const lid = (m.chatLid ?? (ehLid ? m.phone : '') ?? '').replace(/\D/g, '') || null
  // Aluna que escreve só pelo LID mas cujo telefone a gente já conhece (ela escreveu antes com os dois):
  // usa o telefone — senão a conversa nasce "sem conta e sem convite" e o agente trava (13–16/10).
  const conhecido = ehLid && lid && !m.fromMe ? await telefoneDoLid(lid) : null
  const phone = conhecido ?? (ehLid ? `${lid}@lid` : (m.phone ?? '').replace(/\D/g, ''))
  // Reação dela a uma mensagem nossa (não tem texto): só interessa se for positiva.
  if (!m.fromMe && m.reaction?.value && m.reaction.referencedMessage?.fromMe && phone && !ehResponsavel(phone)) {
    const emoji = m.reaction.value
    after(() => processarReacao(phone, emoji))
    return NextResponse.json({ ok: true, reacao: true })
  }

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
      const citada = m.referenceMessageId
      after(async () => {
        // Citou uma consulta ou começou com "#id" → é resposta de consulta. Senão, pode ser COMANDO
        // ("libera o Pilates para…", "resumo de hoje", "sim"); se não for, segue como resposta de consulta.
        await registrarMensagem({ phone: phone.replace(/\D/g, ''), direction: 'in', author: 'human', body: fala, waMessageId }).catch(() => false)
        const ehConsulta = (citada && (await consultaPorAlerta(citada))) || /^#\d+/.test(fala.trim())
        if (!ehConsulta) {
          try {
            if (await tratarComando(fala, dizerAoResponsavel)) return
          } catch (err) {
            console.error('[comando] falhou:', err)
          }
          // Sem citação e sem "#id": quem decide a que ele responde é o roteador por intenção (05/11/2026).
          try {
            const [consultas, reembolsos] = await Promise.all([consultasPendentes(), reembolsosPendentes()])
            const r = await interpretarRespostaResponsavel({
              texto: fala,
              consultas: consultas.map((c) => ({ id: c.id, nome: c.nome ?? '', resumo: c.resumo })),
              reembolsos: reembolsos.map((x) => ({ numero: x.params.numero ?? 0, nome: x.params.nome, produto: x.params.produto })),
            })
            if (r.tipo === 'reembolso') {
              await dizerAoResponsavel(await aprovarReembolsos({ aprovar: r.aprovar, todos: r.todos, numeros: r.numeros }))
              return
            }
            if (r.tipo === 'consulta' && r.consultaId && r.orientacao) {
              await responderConsulta(`#${r.consultaId} ${r.orientacao}`, undefined)
              return
            }
          } catch (err) {
            console.error('[roteador] falhou:', err)
          }
        }
        await responderConsulta(fala, citada)
      })
    }
    return NextResponse.json({ ok: true, responsavel: true })
  }

  if (lid && !ehLid) await salvarLid(phone, lid)
  const nova = await registrarMensagem({ phone, direction: 'in', author: 'student', body: texto, waMessageId })
  if (nova) after(() => processarEntrada(phone, waMessageId))
  return NextResponse.json({ ok: true })
}
