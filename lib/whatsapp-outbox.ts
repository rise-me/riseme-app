// Fila de envio do WhatsApp (migration_009). Quem quer mandar mais tarde ENFILEIRA;
// o cron /api/whatsapp/outbox (a cada minuto) chama processarFila(), que envia o que
// venceu, registra no histórico como 'system' e apaga a senha do body depois do envio.

import { conexaoZapi, filaZapi, sendZapiText, temWhatsApp, toZapiPhone } from '@/lib/zapi'
import { admin, registrarMensagem, variantesTelefone } from '@/lib/whatsapp-agent/conversa'
import { decidirResposta } from '@/lib/whatsapp-agent/responder'

const MAX_TENTATIVAS = 5
const REPROGRAMAR_MS = 2 * 60_000
const POR_RODADA = 15 // ~3 s por envio (delayTyping) — cabe nos 60 s do cron; pico real é bem menor
const TRAVA_EXPIRA_MS = 5 * 60_000 // função morta no meio do envio não prende o item pra sempre
const MASCARA = '••••••'
// PAUSADOS = envios a quem não nos escreveu que seguem desligados até o Bruno decidir (restrição da Meta em 14/11).
// Acesso, convite de depoimento e aviso do Protokół saíram daqui: valem pelo REGIME "A PEDIDO" logo abaixo.
const PAUSADOS = new Set(['pase', 'convite-comunidade', 'convite-grupo', 'lembrete-24h', 'recuperacao', 'recuperacao-2', 'video-convite', 'depo-hotmart', 'acesso-retro'])
const pausado = (kind: string) => PAUSADOS.has(kind)

// ── REGIME "A PEDIDO" (Bruno 14/11/2026: "ela clica, cai no WhatsApp com a mensagem pronta, envia, o bot responde, e
// ninguém recebe mensagem sem ter escrito antes"; vale para todos os idiomas). Causa: ~3 mensagens com link por compradora
// a ~280 polonesas/dia que nunca respondiam = WhatsApp restrito pela Meta. Como funciona: a mensagem de acesso (uma só) e
// o que vem depois dela NASCEM EM ESPERA (send_after = ESPERA_PEDIDO, nunca vencem sozinhas). Quando a aluna escreve
// (botão da página de obrigado ou qualquer mensagem), liberarEspera() põe o acesso para sair agora e o resto em seguida.
export const ESPERA_PEDIDO = '2099-01-01T00:00:00.000Z'
export const LIMITE_ESPERA = '2090-01-01T00:00:00.000Z' // send_after acima disto = em espera
const formasDoNumero = (phone: string) => variantesTelefone(phone).flatMap((v) => [v, `+${v}`])

/** A aluna já nos escreveu alguma vez por este número? (quem já escreveu pode receber sem pedir de novo) */
export async function jaEscreveu(phone: string): Promise<boolean> {
  const { data } = await admin().from('whatsapp_messages').select('created_at').in('phone', variantesTelefone(phone)).eq('direction', 'in').limit(1)
  return Boolean(data?.length)
}

/**
 * Libera o que está em espera para este número (ou, com outboxId, para a venda cujo acesso é essa linha: caso de quem
 * escreve de um número diferente do checkout; aí as linhas passam a apontar para o número de onde ela escreveu).
 * Acesso sai agora; aviso do Protokół 3 min depois; convite de depoimento 30 min depois. Devolve true se liberou um acesso.
 */
export async function liberarEspera(phone: string, outboxId?: number): Promise<boolean> {
  const db = admin()
  const base = db.from('whatsapp_outbox').select('id, kind, body, created_at').is('sent_at', null).lt('attempts', MAX_TENTATIVAS).gte('send_after', LIMITE_ESPERA)
  const { data } = outboxId ? await base.or(`id.eq.${outboxId},depends_on.eq.${outboxId}`) : await base.in('phone', formasDoNumero(phone))
  const linhas = (data ?? []) as { id: number; kind: string; body: string; created_at: string }[]
  const destino = toZapiPhone(phone) ?? phone
  const agora = Date.now()
  const marcar = (id: number, nota: string) => db.from('whatsapp_outbox').update({ sent_at: new Date().toISOString(), body: nota, claimed_at: null }).eq('id', id)
  // Mais de uma compra em espera: só o acesso MAIS NOVO sai (a senha das linhas antigas já não vale). As antigas ficam
  // como atendidas, sem apagar: linha de venda da Stripe que some faz a conferência re-enfileirar ([Alunas Stripe], 14/11).
  const acessos = linhas.filter((r) => r.kind === 'acesso').sort((x, y) => y.id - x.id)
  for (const velho of acessos.slice(1)) await marcar(velho.id, '(substituída: saiu o acesso mais novo desta aluna)')
  const principal = acessos[0]
  let reenviado = false
  if (principal && agora - new Date(principal.created_at).getTime() > PEDIDO_TARDIO_MS) {
    // Pediu dias depois da compra: a senha guardada pode ter mudado → acesso novo, com senha nova (mesmo caminho do reenvio).
    const email = principal.body.match(/[^\s:<>*]+@[^\s<>*]+\.[a-z]{2,}/i)?.[0]
    if (email && (await enfileirar({ phone: destino, kind: 'reenviar-acesso', body: JSON.stringify({ email }), sendAfter: new Date() }))) {
      await marcar(principal.id, '(pedido tardio: acesso reenviado com senha nova)')
      reenviado = true
    }
  }
  for (const r of linhas) {
    if (r.kind === 'acesso' && (r.id !== principal?.id || reenviado)) continue
    const atraso = r.kind === 'acesso' ? 0 : r.kind.startsWith('aviso-extra:') ? 3 * 60_000 : r.kind === 'depoimento' ? 30 * 60_000 : 60_000
    await db.from('whatsapp_outbox').update({ send_after: new Date(agora + atraso).toISOString(), ...(outboxId ? { phone: destino } : {}) }).eq('id', r.id)
  }
  return Boolean(principal)
}
const PEDIDO_TARDIO_MS = 48 * 3_600_000

// Mensagem pronta do botão "abrir conversa" (página de obrigado, e-mail): código da venda da Stripe entre parênteses,
// ou a frase fixa (Hotmart, sem código). Quem só apertou o botão recebe o acesso e nada mais (sem resposta do agente).
const CODIGO_BOTAO = /\((?:kod|c[oó]digo|code):\s*([A-Za-z0-9]{6,12})\)/i
const FRASE_BOTAO = /acabo de unirme al reto riseme|w[łl]a[śs]nie do[łl][ąa]czy[łl]am do wyzwania riseme/i
const FALA_DE_ACESSO = /acces|dost[eę]p|contrase|has[łl]|password|entrar|ingres|login|zalog|wej[śs][ćc]/i

/**
 * Chamado a cada mensagem recebida de aluna, antes do agente. Libera o que estava em espera para ela. Devolve true quando
 * a mensagem já está atendida pelo acesso que vai sair (botão, ou fala curta sobre acesso) e o agente NÃO deve responder:
 * evita duas mensagens de acesso (a da fila e um reenvio do agente com senha nova).
 */
export async function atenderPedido(phone: string, texto: string): Promise<boolean> {
  const codigo = texto.match(CODIGO_BOTAO)?.[1]
  const botao = Boolean(codigo) || FRASE_BOTAO.test(texto)
  for (let tentativa = 0; tentativa < (botao ? 4 : 1); tentativa++) {
    if (tentativa) await new Promise((r) => setTimeout(r, 5000)) // o botão pode chegar antes de o webhook da venda gravar
    if (await liberarEspera(phone)) return botao || (texto.length <= 200 && FALA_DE_ACESSO.test(texto))
    if (codigo) {
      // Escreveu de um número diferente do checkout: acha a venda pelo fim do id da sessão da Stripe.
      const { data: v } = await admin().from('stripe_vendas').select('wa_outbox_id').like('session_id', `%${codigo}`).limit(2)
      if (v?.length === 1 && v[0].wa_outbox_id && (await liberarEspera(phone, v[0].wa_outbox_id as number))) return true
    }
  }
  return false
}
// Com a instância DESCONECTADA só roda o que não entrega nada ao WhatsApp (a Z-API guardaria numa fila e soltaria tudo junto).
const SEM_WHATSAPP = ['teste-agente', 'hotmart', 'zapi', 'email-suporte']

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
    .lt('send_after', LIMITE_ESPERA) // em espera (regime a pedido) não tem hora marcada
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
  // O que o CLASSIFICADOR entendeu nas últimas respostas (kind 'uso-llm' guarda os assuntos): dinheiro, técnico ou feedback = problema.
  // A lista de palavras fica só como atalho (Bruno 05/11: palavra exata não decide nada).
  const { data: usos } = await admin().from('whatsapp_outbox').select('body').eq('kind', 'uso-llm').in('phone', formas).gte('created_at', new Date(Date.now() - 3 * 86_400_000).toISOString()).order('created_at', { ascending: false }).limit(5)
  for (const u of usos ?? []) {
    try { const b = JSON.parse(u.body) as { assuntos?: string }; if (/dinheiro|tecnico|feedback/.test(b.assuntos ?? '')) return true } catch { /* linha inválida */ }
  }
  return ms.some((m) => m.author === 'student' && SINAL_DE_PROBLEMA.test(m.body))
}

async function motivoParaPular(phone: string, kind: string, id: number): Promise<string | null> {
  if (await pediuParaParar(phone)) return 'pediu para não receber mensagens'
  if ((kind === 'depoimento' || kind === 'convite-comunidade' || kind === 'convite-grupo') && (await estaComProblema(phone))) return 'aluna com problema/pergunta aberta'
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
  const desconectada = (await conexaoZapi()).estado === 'desconectado'
  let consulta = db
    .from('whatsapp_outbox')
    .select('id, phone, kind, body, mask, depends_on, attempts')
    .is('sent_at', null)
    .or(`claimed_at.is.null,claimed_at.lt.${travaVencida()}`)
    .lt('attempts', MAX_TENTATIVAS)
    .lte('send_after', agora)
  if (desconectada) consulta = consulta.in('kind', SEM_WHATSAPP) // o resto fica na fila, intacto, até reconectar
  // Pausados nem entram na rodada: na reconexão de 15/11 havia ~100 lembretes vencidos na frente e o acesso de quem
  // escrevesse esperaria ~7 rodadas atrás deles (15 por minuto).
  else consulta = consulta.not('kind', 'in', `(${[...PAUSADOS].map((k) => `"${k}"`).join(',')})`)
  const { data } = await consulta.order('send_after', { ascending: true }).limit(POR_RODADA)

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

    // PAUSA (14/11/2026, WhatsApp do suporte RESTRITO pela Meta): nada que a aluna não pediu sai até o Bruno liberar.
    // Só passam acesso, apoio, respostas e o que ele manda. Liberar = esvaziar PAUSADOS e republicar.
    if (pausado(item.kind)) {
      await db.from('whatsapp_outbox').update({ claimed_at: null, send_after: new Date(Date.now() + 7 * 24 * 3_600_000).toISOString() }).eq('id', item.id)
      continue
    }

    // Ordem garantida: a msg de apoio só sai depois da de acesso.
    if (item.depends_on && (await dependenciaPendente(item.depends_on))) {
      await db
        .from('whatsapp_outbox')
        .update({ claimed_at: null, send_after: new Date(Date.now() + 60_000).toISOString() })
        .eq('id', item.id)
      continue
    }

    // Convite de depoimento/oferta agendado: confere na hora de enviar se ainda faz sentido.
    if (item.kind === 'depoimento' || item.kind === 'pase' || item.kind === 'depo-hotmart' || item.kind === 'convite-comunidade' || item.kind === 'convite-grupo') {
      const motivo = await motivoParaPular(item.phone, item.kind, item.id)
      if (motivo) {
        await db
          .from('whatsapp_outbox')
          .update({ attempts: MAX_TENTATIVAS, last_error: `pulado: ${motivo}`, claimed_at: null })
          .eq('id', item.id)
        continue
      }
    }

    // Reenvio de acesso (scripts/reenviar-acesso.ts): número mal formado não recebe senha. A conferência
    // é aqui porque a chave da Z-API só existe no servidor; pula também a msg de apoio que depende dela.
    if (item.kind === 'acesso-retro' && (await temWhatsApp(item.phone)) === false) {
      const pulo = { attempts: MAX_TENTATIVAS, last_error: 'pulado: número sem WhatsApp', claimed_at: null }
      await db.from('whatsapp_outbox').update(pulo).eq('id', item.id)
      await db.from('whatsapp_outbox').update(pulo).eq('depends_on', item.id).is('sent_at', null)
      continue
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
        const caso = JSON.parse(item.body) as { nome: string; perfil: Parameters<typeof decidirResposta>[0]['perfil']; msgs: (string | { a: 'student' | 'agent' | 'human'; t: string; em?: string })[]; conviteHotmart?: { presente: string | null }; conviteVideo?: boolean; hotmart?: string; hotmartEmail?: string; emailSemConta?: string }
        const agora = new Date().toISOString()
        // hotmartEmail = consulta real à Hotmart no teste; hotmart = bloco pronto (teste sem credencial)
        // hotmartEmail = a Hotmart é consultada só se o CLASSIFICADOR disser dinheiro (como em produção); hotmart = bloco pronto
        const { resumoHotmart } = await import('@/lib/hotmart-api')
        const d = await decidirResposta({ perfil: caso.perfil, conversa: caso.msgs.map((m) => (typeof m === 'string' ? { autor: 'student' as const, texto: m, em: agora } : { autor: m.a, texto: m.t, em: m.em ?? agora })), agora, conviteHotmart: caso.conviteHotmart, conviteVideo: caso.conviteVideo, hotmart: caso.hotmart ?? null, emailSemConta: caso.emailSemConta, buscarHotmart: caso.hotmartEmail ? () => resumoHotmart(caso.hotmartEmail!) : undefined })
        saida = JSON.stringify({ ...caso, resultado: d })
      } catch (err) {
        saida = JSON.stringify({ erro: String(err), entrada: item.body.slice(0, 500) })
      }
      await db.from('whatsapp_outbox').update({ sent_at: new Date().toISOString(), attempts: item.attempts + 1, body: saida }).eq('id', item.id)
      continue
    }

    // 'grupo' não manda texto: lê ou renomeia um grupo do suporte (body = JSON {acao:'buscar', nome} ou
    // {acao:'renomear', groupId, nome} ou {acao:'enquete', groupId, nome, opcoes} ou {acao:'texto', groupId, nome = a mensagem}) e grava o resultado no body. A chave da Z-API só existe no servidor (02/11/2026).
    // 'hotmart' não manda texto: consulta a Hotmart pelo e-mail (body = JSON {email}) e grava o bloco no body. Serve para
    // testar a credencial e para conferir consultas pendentes sem a chave sair da Vercel (04/11/2026).
    // 'zapi' (14/11/2026): body = JSON {acao: 'status' | 'fila' | 'limpar-fila'}; olha/limpa a fila PRÓPRIA da Z-API (o chat não
    // tem a chave localmente). Limpar antes de reconectar, senão tudo que ficou preso sai de uma vez.
    if (item.kind === 'zapi') {
      let saida: string
      try {
        const { acao } = JSON.parse(item.body) as { acao: 'status' | 'fila' | 'limpar-fila' }
        const conexao = await conexaoZapi()
        saida = JSON.stringify({ acao, conexao, ...(acao === 'fila' ? { fila: await filaZapi('contar') } : acao === 'limpar-fila' ? { limpeza: await filaZapi('limpar'), depois: await filaZapi('contar') } : {}) })
      } catch (err) {
        saida = `erro: ${String(err).slice(0, 300)}`
      }
      await db.from('whatsapp_outbox').update({ sent_at: new Date().toISOString(), attempts: item.attempts + 1, body: saida }).eq('id', item.id)
      continue
    }

    // 'email-suporte' (14/11/2026): e-mail do suporte mandado pelo chat (a chave do Resend só existe no servidor).
    // body = JSON {para, assunto, texto, idioma?, de?, titulo?, botao?: {rotulo, link}, rodape?}. Aviso às alunas e resposta manual.
    if (item.kind === 'email-suporte') {
      let erro: string | null = null
      try {
        const { enviarEmailSuporte } = await import('@/lib/email-suporte')
        const e = JSON.parse(item.body) as Parameters<typeof enviarEmailSuporte>[0]
        // para = 'responsavel' → ALERTA_EMAIL (prévia para o Bruno sem o chat conhecer o endereço)
        const para = e.para === 'responsavel' || item.phone === 'responsavel' ? (process.env.ALERTA_EMAIL ?? '').split(',')[0]?.trim() : (e.para ?? item.phone)
        if (!para) throw new Error('sem destinatário (ALERTA_EMAIL ausente?)')
        const r = await enviarEmailSuporte({ ...e, para, registrar: e.para !== 'responsavel' && item.phone !== 'responsavel' })
        if (!r.ok) erro = r.erro
      } catch (err) {
        erro = String(err).slice(0, 300)
      }
      if (erro) { falhas++; await db.from('whatsapp_outbox').update({ attempts: item.attempts + 1, last_error: erro, claimed_at: null, send_after: new Date(Date.now() + REPROGRAMAR_MS).toISOString() }).eq('id', item.id) }
      else { enviados++; await db.from('whatsapp_outbox').update({ sent_at: new Date().toISOString(), attempts: item.attempts + 1, last_error: null }).eq('id', item.id) }
      continue
    }

    if (item.kind === 'hotmart') {
      let saida: string
      try {
        const { email } = JSON.parse(item.body) as { email: string }
        const { resumoHotmart, hotmartConfigurada } = await import('@/lib/hotmart-api')
        saida = JSON.stringify({ email, configurada: hotmartConfigurada(), bloco: await resumoHotmart(email) })
      } catch (err) {
        saida = JSON.stringify({ erro: String(err).slice(0, 500), entrada: item.body.slice(0, 300) })
      }
      await db.from('whatsapp_outbox').update({ sent_at: new Date().toISOString(), attempts: item.attempts + 1, body: saida }).eq('id', item.id)
      continue
    }

    // 'apagar-mensagem' (10/11/2026): body = JSON {messageId}; apaga "para todos" uma mensagem nossa na conversa item.phone
    // (Z-API DELETE /messages). Caso de origem: acesso da Stripe que saiu errado para 22 compradoras polonesas (Bruno: "apaga").
    if (item.kind === 'apagar-mensagem') {
      let saida: string
      try {
        const { messageId } = JSON.parse(item.body) as { messageId: string }
        const instance = process.env.ZAPI_INSTANCE_ID
        const token = process.env.ZAPI_TOKEN
        const headers: Record<string, string> = process.env.ZAPI_CLIENT_TOKEN ? { 'Client-Token': process.env.ZAPI_CLIENT_TOKEN } : {}
        const url = `https://api.z-api.io/instances/${instance}/token/${token}/messages?messageId=${encodeURIComponent(messageId)}&phone=${toZapiPhone(item.phone)}&owner=true`
        const res = await fetch(url, { method: 'DELETE', headers })
        const corpo = await res.text()
        saida = res.ok ? `apagada ${messageId}` : `FALHOU ${res.status} ${corpo.slice(0, 200)}`
      } catch (err) {
        saida = `erro: ${String(err).slice(0, 300)}`
      }
      await db.from('whatsapp_outbox').update({ sent_at: new Date().toISOString(), attempts: item.attempts + 1, body: saida }).eq('id', item.id)
      continue
    }

    // 'avisar-responsavel' (10/11/2026): body = texto livre; manda ao WHATSAPP_HANDOFF_PHONE (o chat não tem o número localmente).
    if (item.kind === 'avisar-responsavel') {
      const destino = (process.env.WHATSAPP_HANDOFF_PHONE ?? '').replace(/\D/g, '')
      // body = texto livre, ou JSON {imagem, legenda} para mandar imagem (prévia do post do grupo, 11/11/2026)
      let img: { imagem?: string; legenda?: string } | null = null
      try { img = item.body.trim().startsWith('{') ? JSON.parse(item.body) : null } catch { img = null }
      const { sendZapiImage } = await import('@/lib/zapi')
      const r = !destino ? { ok: false as const, error: 'sem WHATSAPP_HANDOFF_PHONE' }
        : img?.imagem ? await sendZapiImage({ phone: destino, image: img.imagem, caption: img.legenda })
        : await sendZapiText({ phone: destino, message: item.body, delayTyping: 1 })
      await db.from('whatsapp_outbox').update({ sent_at: new Date().toISOString(), attempts: item.attempts + 1, last_error: r.ok ? null : r.error }).eq('id', item.id)
      continue
    }

    // 'reenviar-acesso' (08/11/2026): body = JSON {email}; liga a conversa (item.phone) à conta desse e-mail, corrige o telefone da
    // conta e reenvia o acesso com senha nova NESTA conversa. Para o caso em que o acesso foi para outro número (checkout errado).
    if (item.kind === 'reenviar-acesso') {
      let saida: string
      try {
        const { email } = JSON.parse(item.body) as { email: string }
        const { data: u } = await db.from('users').select('id').ilike('email', email).limit(1).maybeSingle()
        if (!u) throw new Error(`sem conta com ${email}`)
        const { reenviarAcesso } = await import('@/lib/whatsapp-agent/acesso')
        const { perfilDaAluna } = await import('@/lib/whatsapp-agent/conversa')
        await db.from('whatsapp_chats').upsert({ phone: item.phone, user_id: u.id, updated_at: new Date().toISOString() }, { onConflict: 'phone' })
        if (!item.phone.endsWith('@lid')) await db.from('users').update({ phone: `+${item.phone.replace(/\D/g, '')}` }).eq('id', u.id)
        const perfil = await perfilDaAluna(u.id).catch(() => null)
        await reenviarAcesso({ userId: u.id, phone: item.phone, email, idioma: perfil?.idioma ?? 'es', nova: true })
        saida = `acesso reenviado para ${email} em ${item.phone}`
      } catch (err) {
        saida = `erro: ${String(err).slice(0, 300)}`
      }
      await db.from('whatsapp_outbox').update({ sent_at: new Date().toISOString(), attempts: item.attempts + 1, body: saida }).eq('id', item.id)
      continue
    }

    // 'aprovar-comando' (08/11/2026): body = JSON {id}; executa um comando aguardando (aprovação dada pelo Bruno no chat).
    if (item.kind === 'aprovar-comando') {
      let saida: string
      try {
        const { id } = JSON.parse(item.body) as { id: number }
        const { aprovarComando } = await import('@/lib/whatsapp-agent/comandos')
        saida = `✅ ${await aprovarComando(id)}`
      } catch (err) {
        saida = `erro: ${String(err).slice(0, 300)}`
      }
      await db.from('whatsapp_outbox').update({ sent_at: new Date().toISOString(), attempts: item.attempts + 1, body: saida }).eq('id', item.id)
      continue
    }

    // 'pedir-cancelamento' não manda texto à aluna: pede ao responsável, no WhatsApp dele, a aprovação de um cancelamento de
    // assinatura (body = JSON da aluna + código da assinatura; lib/whatsapp-agent/comandos.ts). Ele responde sim/não (06/11/2026).
    if (item.kind === 'pedir-cancelamento') {
      let saida: string
      try {
        const { pedirAprovacaoCancelamento } = await import('@/lib/whatsapp-agent/comandos')
        const a = JSON.parse(item.body) as Parameters<typeof pedirAprovacaoCancelamento>[0]
        saida = (await pedirAprovacaoCancelamento(a)) ?? 'FALHOU: sem WHATSAPP_HANDOFF_PHONE ou envio recusado'
      } catch (err) {
        saida = `erro: ${String(err).slice(0, 300)}`
      }
      await db.from('whatsapp_outbox').update({ sent_at: new Date().toISOString(), attempts: item.attempts + 1, body: saida }).eq('id', item.id)
      continue
    }

    // 'reembolsos-lista' não manda texto à aluna: manda ao responsável a lista das 20h (consultas + reembolsos; 05/11/2026).
    if (item.kind === 'reembolsos-lista') {
      const { enviarListaDiaria } = await import('@/lib/whatsapp-agent/lista-20h')
      const msg = await enviarListaDiaria().catch((err) => `erro: ${String(err).slice(0, 300)}`)
      await db.from('whatsapp_outbox').update({ sent_at: new Date().toISOString(), attempts: item.attempts + 1, body: msg ?? 'lista vazia' }).eq('id', item.id)
      continue
    }

    if (item.kind === 'grupo') {
      let saida: string
      try {
        const { zapiGet, renomearGrupo, enviarEnquete } = await import('@/lib/zapi')
        const p = JSON.parse(item.body) as { acao: 'buscar' | 'renomear' | 'enquete' | 'texto' | 'imagem' | 'ajustes'; nome: string; groupId?: string; opcoes?: string[]; ajustes?: Record<string, boolean>; imagem?: string }
        if (p.acao === 'ajustes') {
          // a Z-API exige todos os campos: mantém os atuais e troca só os que vierem em p.ajustes
          const m = (await zapiGet(`group-metadata/${p.groupId}`)) as Record<string, unknown> | null
          const atual = { adminOnlyMessage: Boolean(m?.adminOnlyMessage), adminOnlySettings: Boolean(m?.adminOnlySettings ?? true), requireAdminApproval: Boolean(m?.requireAdminApproval), adminOnlyAddMember: true }
          const { ajustarGrupo } = await import('@/lib/zapi')
          saida = JSON.stringify({ ...p, antes: atual, ok: await ajustarGrupo({ phone: p.groupId!, ...atual, ...p.ajustes }) })
        } else if (p.acao === 'texto') {
          const { sendZapiText } = await import('@/lib/zapi')
          saida = JSON.stringify({ ...p, r: await sendZapiText({ phone: p.groupId!, message: p.nome }) })
        } else if (p.acao === 'imagem') {
          // imagem = URL; nome = legenda (10/11/2026: post das afiliadas com o print da enquete)
          const { sendZapiImage } = await import('@/lib/zapi')
          saida = JSON.stringify({ ...p, r: await sendZapiImage({ phone: p.groupId!, image: p.imagem!, caption: p.nome }) })
        } else if (p.acao === 'enquete') {
          // nome = pergunta; sem pollMaxOptions = várias respostas (doc send-poll da Z-API)
          saida = JSON.stringify({ ...p, ok: await enviarEnquete(p.groupId!, p.nome, p.opcoes ?? []) })
        } else if (p.acao === 'renomear') {
          saida = JSON.stringify({ ...p, ok: await renomearGrupo(p.groupId!, p.nome) })
        } else {
          const achados: { phone: string; name: string }[] = []
          for (let pg = 1; pg <= 20; pg++) {
            const lista = (await zapiGet(`groups?page=${pg}&pageSize=100`)) as { phone: string; name: string }[] | null
            if (!Array.isArray(lista) || !lista.length) break
            achados.push(...lista.filter((g) => (g.name ?? '').toLowerCase().includes(p.nome.toLowerCase())))
          }
          const grupos = []
          for (const g of achados) {
            const m = (await zapiGet(`group-metadata/${g.phone}`)) as Record<string, unknown> | null
            const part = (m?.participants as { phone: string; isAdmin?: boolean; isSuperAdmin?: boolean }[] | undefined) ?? []
            grupos.push({
              phone: g.phone, name: g.name, subject: m?.subject, invitationLink: m?.invitationLink, communityId: m?.communityId,
              adminOnlyMessage: m?.adminOnlyMessage, requireAdminApproval: m?.requireAdminApproval, growthLocked: m?.growthLocked,
              admins: part.filter((x) => x.isAdmin || x.isSuperAdmin).map((x) => x.phone), participantes: part.map((x) => x.phone),
            })
          }
          saida = JSON.stringify({ ...p, grupos })
        }
      } catch (err) {
        saida = JSON.stringify({ erro: String(err).slice(0, 500), entrada: item.body.slice(0, 300) })
      }
      await db.from('whatsapp_outbox').update({ sent_at: new Date().toISOString(), attempts: item.attempts + 1, body: saida }).eq('id', item.id)
      continue
    }

    // 'revisao-semanal' não manda texto: gera a revisão do atendimento na hora (body = JSON {dias}); o cron de segunda
    // faz o mesmo sozinho. Serve para rodar a 1ª (acúmulo) sem ter a chave da Anthropic fora do servidor (30/10/2026).
    if (item.kind === 'revisao-semanal') {
      let saida: string
      try {
        const { dias } = JSON.parse(item.body || '{}') as { dias?: number }
        const { gerarRevisao } = await import('@/lib/revisao-semanal')
        saida = JSON.stringify(await gerarRevisao({ dias: dias || 7, forcar: true }))
      } catch (err) {
        saida = JSON.stringify({ ok: false, erro: String(err).slice(0, 500) })
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
        body: JSON.stringify({ phone: item.phone, silencioso: item.body === 'silencioso' }),
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
