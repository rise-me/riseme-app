// Comandos do responsável pelo WhatsApp (migration_012). Ele pede em português; o sistema acha a aluna,
// mostra o que vai fazer e só executa depois do "sim". Lista FECHADA de ações — nada de código, deploy
// ou configuração por aqui. Cada pedido fica em whatsapp_comandos.

import { admin, passarParaHumano, registrarMensagem, perfilDaAluna } from './conversa'
import { interpretarComando, type PedidoComando } from './responder'
import { darCardapioBonus } from '@/lib/diet/quota'
import { generateAccessCode, buildAccessLink } from '@/lib/access-code'
import { aberturaReenvio, mensagensDeAcesso } from '@/lib/whatsapp-access'
import { sendZapiText, toZapiPhone } from '@/lib/zapi'

const VALIDADE_MIN = 30 // um "sim" depois disso não executa nada
const APP_URL = 'https://riseme.app'

const NOME_PRODUTO: Record<string, string> = {
  '1': 'Calistenia en Casa',
  '2': 'Pilates en la Pared',
  '3': 'Yoga Facial',
  '4': 'Yoga en la Silla',
  '5': 'Cuerpo Sexy de Verano',
  'protocolo-metabolico': 'Protocolo Metabólico',
}

interface Aluna {
  id: string
  nome: string
  email: string
  phone: string | null
}

type Dizer = (msg: string) => Promise<unknown>

const SIM = /^(sim|s|si|confirmo|confirma|pode|ok|manda|faz|isso)\b/i
const NAO = /^(n[aã]o|cancela|cancelar|deixa|esquece)\b/i

/**
 * Trata a mensagem do responsável se ela for um comando (ou o "sim"/"não" de um comando).
 * Devolve false quando não é comando — aí ela segue para o fluxo das consultas.
 */
export async function tratarComando(texto: string, dizer: Dizer): Promise<boolean> {
  const t = texto.trim()

  // 1) confirmação/cancelamento do último comando aguardando
  if (SIM.test(t) || NAO.test(t)) {
    const aguardando = await comandoAguardando()
    if (!aguardando) return false // "sim" solto pode ser resposta de consulta
    if (NAO.test(t)) {
      await fechar(aguardando.id, 'cancelado', 'cancelado pelo responsável')
      await dizer(`❎ Cancelado: ${aguardando.resumo}`)
      return true
    }
    try {
      const resultado = await executar(aguardando.acao, aguardando.params as Params)
      await fechar(aguardando.id, 'executado', resultado)
      await dizer(`✅ ${resultado}`)
    } catch (err) {
      const detalhe = (err instanceof Error ? err.message : String(err)).slice(0, 250)
      await fechar(aguardando.id, 'erro', detalhe)
      await dizer(`❌ Não consegui: ${detalhe}`)
    }
    return true
  }

  // 2) pedido novo
  const pedido = await interpretarComando(t)
  if (pedido.acao === 'nenhuma') return false

  if (pedido.acao === 'resumo') {
    await dizer(await resumoDoDia())
    return true
  }

  const alvo = await acharAluna(pedido)
  if (typeof alvo === 'string') {
    await dizer(alvo)
    return true
  }
  const plano = planejar(pedido, alvo)
  if (typeof plano === 'string') {
    await dizer(plano)
    return true
  }
  await admin()
    .from('whatsapp_comandos')
    .update({ status: 'cancelado', resultado: 'substituído por um pedido novo', decided_at: new Date().toISOString() })
    .eq('status', 'aguardando')
  await admin().from('whatsapp_comandos').insert({ pedido: t, acao: pedido.acao, params: plano.params, resumo: plano.resumo })
  await dizer(`🛠️ ${plano.resumo}\n\nConfirma? Responda *sim* para executar ou *não* para cancelar.`)
  return true
}

type Params = { userId: string; email: string; nome: string; produto?: string; novoEmail?: string; phone?: string | null }

function planejar(p: PedidoComando, a: Aluna): { resumo: string; params: Params } | string {
  const quem = `${a.nome || 'aluna'} (${a.email})`
  const base: Params = { userId: a.id, email: a.email, nome: a.nome, phone: a.phone }
  switch (p.acao) {
    case 'liberar_produto':
      if (!p.produto) return 'Qual produto? (Calistenia, Pilates en la Pared, Yoga Facial, Yoga en la Silla, Cuerpo Sexy de Verano ou Protocolo Metabólico)'
      return { resumo: `Vou liberar *${NOME_PRODUTO[p.produto]}* (vitalício) para ${quem}.`, params: { ...base, produto: p.produto } }
    case 'reenviar_acesso':
      return {
        resumo: `Vou gerar uma *senha nova* para ${quem} e mandar o acesso completo no WhatsApp dela. A senha atual deixa de valer.`,
        params: base,
      }
    case 'trocar_email':
      if (!p.novoEmail || !p.novoEmail.includes('@')) return 'Para qual email? Ex.: "troca o email de fulana@x.com para fulana@y.com".'
      return { resumo: `Vou trocar o email de ${quem} para *${p.novoEmail}*. Ela passa a entrar com o email novo e a mesma senha.`, params: { ...base, novoEmail: p.novoEmail } }
    case 'cardapio_extra':
      return { resumo: `Vou dar *1 cardápio extra* para ${quem}.`, params: base }
    case 'pausar_bot':
      return { resumo: `Vou *parar o bot* por 24 h na conversa de ${quem} (você responde pelo celular).`, params: base }
    default:
      return 'Não sei fazer isso por aqui.'
  }
}

async function executar(acao: string, p: Params): Promise<string> {
  const db = admin()
  switch (acao) {
    case 'liberar_produto': {
      const { error } = await db
        .from('user_challenges')
        .upsert({ user_id: p.userId, challenge_id: p.produto, access_type: 'lifetime' }, { onConflict: 'user_id,challenge_id', ignoreDuplicates: true })
      if (error) throw new Error(error.message)
      return `${NOME_PRODUTO[p.produto!]} liberado para ${p.nome || p.email}. Ela vê ao abrir o app (Desafios ou Extras → Tus productos).`
    }
    case 'cardapio_extra': {
      await darCardapioBonus(p.userId, `manual-${Date.now()}`)
      return `1 cardápio extra dado para ${p.nome || p.email}. Aparece na aba do cardápio.`
    }
    case 'trocar_email': {
      const { data: existe } = await db.from('users').select('id').eq('email', p.novoEmail!).limit(1)
      if (existe?.length) throw new Error(`já existe uma conta com ${p.novoEmail}`)
      const { error } = await db.auth.admin.updateUserById(p.userId, { email: p.novoEmail!, email_confirm: true })
      if (error) throw new Error(error.message)
      await db.from('users').update({ email: p.novoEmail! }).eq('id', p.userId)
      return `Email de ${p.nome || p.email} trocado para ${p.novoEmail}. A senha continua a mesma.`
    }
    case 'pausar_bot': {
      const chat = await chatDaAluna(p.userId, p.phone)
      if (!chat) throw new Error('não achei conversa de WhatsApp dela')
      await passarParaHumano(chat, 24, 'pausado pelo responsável (comando)')
      return `Bot pausado por 24 h na conversa de ${p.nome || p.email}.`
    }
    case 'reenviar_acesso': {
      const chat = await chatDaAluna(p.userId, p.phone)
      if (!chat) throw new Error('não achei o WhatsApp dela (sem telefone na conta e sem conversa)')
      const perfil = await perfilDaAluna(p.userId)
      const locale = perfil?.idioma ?? 'es'
      const code = generateAccessCode()
      const { error } = await db.auth.admin.updateUserById(p.userId, { password: code })
      if (error) throw new Error(error.message)
      const [acesso] = mensagensDeAcesso({ locale, email: p.email, code, link: buildAccessLink(APP_URL, locale, p.email, code) })
      const msg = `${aberturaReenvio(locale)}\n\n${acesso}`
      const r = await sendZapiText({ phone: chat, message: msg, delayTyping: 2 })
      if (!r.ok) throw new Error(`senha trocada, mas o envio falhou: ${r.error}`)
      await registrarMensagem({ phone: toZapiPhone(chat), direction: 'out', author: 'system', body: msg.replaceAll(code, '••••••'), waMessageId: r.messageId })
      return `Acesso novo enviado para ${p.nome || p.email} (senha nova; a antiga não vale mais).`
    }
    default:
      throw new Error(`ação desconhecida: ${acao}`)
  }
}

// Onde ela conversa: o chat ligado à conta (pode ser um LID) ou o telefone da compra.
async function chatDaAluna(userId: string, phone: string | null | undefined): Promise<string | null> {
  const { data } = await admin()
    .from('whatsapp_chats')
    .select('phone')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
  return data?.[0]?.phone ?? (phone ? phone.replace(/\D/g, '') : null)
}

async function acharAluna(p: PedidoComando): Promise<Aluna | string> {
  const db = admin()
  if (p.email) {
    const { data } = await db.from('users').select('id, name, email, phone').eq('email', p.email).limit(1)
    if (data?.[0]) return { id: data[0].id, nome: data[0].name ?? '', email: data[0].email, phone: data[0].phone }
    return `Não achei conta com o email ${p.email}.`
  }
  if (p.nome) {
    const { data } = await db.from('users').select('id, name, email, phone').ilike('name', `%${p.nome}%`).limit(6)
    if (!data?.length) return `Não achei aluna com o nome "${p.nome}". Manda o email dela.`
    if (data.length > 1) {
      return `Achei ${data.length} alunas com "${p.nome}":\n${data.map((u) => `• ${u.name} — ${u.email}`).join('\n')}\n\nRepete o pedido com o email.`
    }
    return { id: data[0].id, nome: data[0].name ?? '', email: data[0].email, phone: data[0].phone }
  }
  return 'De qual aluna? Manda o email (ou o nome).'
}

async function comandoAguardando(): Promise<{ id: number; acao: string; params: unknown; resumo: string } | null> {
  const { data } = await admin()
    .from('whatsapp_comandos')
    .select('id, acao, params, resumo')
    .eq('status', 'aguardando')
    .gte('created_at', new Date(Date.now() - VALIDADE_MIN * 60_000).toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
  return data?.[0] ?? null
}

async function fechar(id: number, status: 'executado' | 'cancelado' | 'erro', resultado: string) {
  await admin().from('whatsapp_comandos').update({ status, resultado, decided_at: new Date().toISOString() }).eq('id', id)
}

// "Hoje" = desde a meia-noite de Brasília (03:00 UTC).
async function resumoDoDia(): Promise<string> {
  const db = admin()
  const agora = new Date()
  const inicio = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate(), 3))
  if (inicio > agora) inicio.setUTCDate(inicio.getUTCDate() - 1)
  const desde = inicio.toISOString()
  const n = (r: { count: number | null }) => r.count ?? 0
  const c = { count: 'exact' as const, head: true }
  const [contas, acessos, respostas, depoimentos, pases, optouts, brindes] = (
    await Promise.all([
      db.from('users').select('id', c).gte('created_at', desde),
      db.from('whatsapp_outbox').select('id', c).eq('kind', 'acesso').gte('sent_at', desde),
      db.from('whatsapp_messages').select('id', c).eq('author', 'agent').gte('created_at', desde),
      db.from('whatsapp_outbox').select('id', c).eq('kind', 'depoimento').gte('sent_at', desde),
      db.from('whatsapp_outbox').select('id', c).eq('kind', 'pase').gte('sent_at', desde),
      db.from('whatsapp_outbox').select('id', c).eq('kind', 'optout').gte('created_at', desde),
      db.from('whatsapp_outbox').select('id', c).eq('kind', 'brinde-depoimento').gte('created_at', desde),
    ])
  ).map(n)
  const { data: abertas } = await db
    .from('whatsapp_consultas')
    .select('id, nome')
    .eq('status', 'pendente')
    .gte('created_at', new Date(Date.now() - 48 * 3600_000).toISOString())
    .order('id', { ascending: true })
  return [
    '📊 *Resumo de hoje* (desde 00h de Brasília)',
    `• Contas novas: ${contas}`,
    `• Acessos enviados no WhatsApp: ${acessos}`,
    `• Respostas do Claude: ${respostas}`,
    `• Depoimento: ${depoimentos} convites · ${brindes} mandaram o print e ganharam o brinde`,
    `• Ofertas do Pase: ${pases}`,
    `• Pediram para não receber mais: ${optouts}`,
    `• Consultas abertas (48 h): ${abertas?.length ?? 0}${abertas?.length ? ` — ${abertas.map((c) => `#${c.id} ${c.nome ?? 'sem conta'}`).join(', ')}` : ''}`,
  ].join('\n')
}
