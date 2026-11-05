// Autosserviço de ACESSO pelo bot (Bruno, 05/11/2026, item 1 do plano do mapa do WhatsApp: "o bot pode, sozinho, criar
// conta pela compra Hotmart, reenviar senha e corrigir e-mail — Sim!"). Até aqui os três viravam consulta ao responsável
// (levantamento das 152 consultas de outubro: acesso/senha/e-mail era a maior causa de transferência).
// 1) CONTA PELA COMPRA: ela escreve de um número sem conta, manda o e-mail, a Hotmart tem compra PAGA de produto que o
//    app entrega (HOTMART_CHALLENGE_MAP) → a conta nasce pelo mesmo caminho do webhook e o acesso sai NESTA conversa.
// 2) SENHA: conta confirmada pelo telefone + "não consigo entrar" → senha nova + mensagem de acesso aqui, na hora.
// 3) E-MAIL: conta confirmada + ela confirmou o e-mail novo → troca + acesso novo com o e-mail novo.
// Conta achada só pelo e-mail digitado (não confirmada) nunca ganha senha nem troca de e-mail por aqui (qualquer um
// digita um e-mail): o caminho é o "¿Olvidaste tu contraseña?" do login, que prova a posse do e-mail.
import { admin, registrarMensagem, telefoneDoLid, variantesTelefone } from './conversa'
import type { MensagemConversa } from './responder'
import { contaDaConvidadaHotmart } from './prova-social'
import { comprasPorEmail, hotmartConfigurada, resumoHotmart, type CompraHotmart } from '@/lib/hotmart-api'
import { getMappingForProduct } from '@/lib/hotmart-map'
import { generateAccessCode, buildAccessLink } from '@/lib/access-code'
import { aberturaReenvio, mensagensDeAcesso } from '@/lib/whatsapp-access'
import { marcarNaFila } from '@/lib/whatsapp-outbox'
import { sendZapiText, toZapiPhone } from '@/lib/zapi'

export const KIND_REENVIO = 'acesso-reenviado' // linha inerte: body = e-mail (trava de 2 h e contagem na revisão semanal)
export const KIND_EMAIL_TROCADO = 'email-trocado' // linha inerte: body = "antigo → novo"
export const KIND_CONTA_CRIADA = 'conta-pela-compra' // linha inerte: body = e-mail (contagem na revisão semanal)
const KIND_SEM_COMPRA = 'hotmart-sem-compra' // linha inerte: body = e-mail; não consulta o mesmo e-mail de novo por 24 h
const HORAS_TRAVA_REENVIO = 2
const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL ?? 'https://riseme.app'
const PAGAS = ['APPROVED', 'COMPLETE']
const EMAIL = /[\w.+-]+@[\w-]+(\.[\w-]+)+/g

export type ResultadoConta =
  | { userId: string; criadaAgora: false } // convidada do convite Hotmart (dados já na fila): como antes
  | { userId: string; criadaAgora: true; email: string; compradaEm: string | null; produto: string }
  | { userId: null; semCompra: { email: string; bloco: string | null } }

async function contaPorEmail(email: string): Promise<string | null> {
  const { data } = await admin().from('users').select('id').ilike('email', email).limit(1)
  return data?.[0]?.id ?? null
}

async function consultouHaPouco(phone: string, email: string): Promise<boolean> {
  const { count } = await admin()
    .from('whatsapp_outbox')
    .select('id', { count: 'exact', head: true })
    .in('phone', variantesTelefone(phone))
    .eq('kind', KIND_SEM_COMPRA)
    .eq('body', email)
    .gte('created_at', new Date(Date.now() - 24 * 3_600_000).toISOString())
  return (count ?? 0) > 0
}

/** Telefone real da conversa (um LID vira o número guardado no chat; sem ele, null). */
async function telefoneReal(phone: string): Promise<string | null> {
  if (!phone.endsWith('@lid')) return phone.replace(/\D/g, '')
  const t = await telefoneDoLid(phone)
  return t ? t.replace(/\D/g, '') : null
}

/** Cria a conta pelo MESMO caminho do webhook (libera o produto, grava a compra no cartão, manda e-mail + WhatsApp). */
async function criarPeloWebhook(compra: CompraHotmart, email: string, phone: string | null): Promise<boolean> {
  const res = await fetch(`${APP_URL()}/api/hotmart`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-hotmart-hottok': process.env.HOTMART_WEBHOOK_TOKEN ?? '' },
    body: JSON.stringify({
      event: 'PURCHASE_APPROVED',
      data: {
        product: { id: compra.produtoId, name: compra.produto },
        buyer: { email, name: compra.compradorNome ?? '', checkout_phone: phone ? `+${phone}` : undefined },
        purchase: {
          transaction: compra.transacao,
          status: 'APPROVED',
          offer: compra.oferta ? { code: compra.oferta } : undefined,
          price: { value: compra.valor ?? undefined, currency_value: compra.moeda ?? undefined },
          approved_date: compra.aprovadaEm ? new Date(compra.aprovadaEm).getTime() : undefined,
        },
      },
    }),
  }).catch(() => null)
  return Boolean(res?.ok)
}

/**
 * Número sem conta: convidada do convite Hotmart (como antes) ou qualquer compradora que mandou o e-mail da compra.
 * Consulta a Hotmart por esse e-mail: compra PAGA de produto mapeado → cria a conta, liga o chat a ela e puxa o acesso
 * para sair agora nesta conversa. Sem compra paga → devolve o e-mail e o bloco HOTMART para o agente explicar.
 * null = nada a fazer (sem e-mail na conversa, já consultado, credencial ausente). Nunca lança.
 */
export async function contaPelaCompraHotmart(p: { phone: string; conversa: MensagemConversa[] }): Promise<ResultadoConta | null> {
  try {
    const convidada = await contaDaConvidadaHotmart(p.phone)
    if (convidada) return { userId: convidada, criadaAgora: false }
    if (!hotmartConfigurada()) return null
    const emails = [...new Set(p.conversa.filter((m) => m.autor === 'student').flatMap((m) => m.texto.match(EMAIL) ?? []).map((e) => e.toLowerCase()))]
    const email = emails[emails.length - 1]
    if (!email || (await contaPorEmail(email)) || (await consultouHaPouco(p.phone, email))) return null

    const compras = await comprasPorEmail(email)
    if (!compras) return null // API fora: o agente segue como antes
    const pagas = compras.filter((c) => PAGAS.includes(c.status) && c.produtoId && getMappingForProduct(String(c.produtoId)))
    if (!pagas.length) {
      await marcarNaFila(p.phone, KIND_SEM_COMPRA, email)
      return { userId: null, semCompra: { email, bloco: await resumoHotmart(email).catch(() => null) } }
    }

    const telefone = await telefoneReal(p.phone)
    for (const c of pagas) await criarPeloWebhook(c, email, telefone) // a 1ª cria a conta, as outras só liberam
    const userId = await contaPorEmail(email)
    if (!userId) {
      console.error(`[acesso] webhook não criou a conta de ${email} (${p.phone})`)
      return null
    }
    // Liga a conversa à conta (confirmada: a compra é dela e o acesso vai para este número).
    await admin().from('whatsapp_chats').update({ user_id: userId, updated_at: new Date().toISOString() }).eq('phone', p.phone)
    await marcarNaFila(p.phone, KIND_CONTA_CRIADA, email)
    const principal = pagas[0]
    if (telefone) {
      // O webhook enfileira o acesso com 15 min de atraso (ela estaria na VSL do upsell); aqui ela está conversando: sai agora.
      const formas = variantesTelefone(telefone).flatMap((v) => [v, `+${v}`])
      await admin().from('whatsapp_outbox').update({ send_after: new Date().toISOString() }).in('phone', formas).in('kind', ['acesso', 'apoio']).is('sent_at', null)
    } else {
      // LID sem telefone conhecido: o webhook não teve para onde mandar; manda o acesso direto nesta conversa.
      const locale = getMappingForProduct(String(principal.produtoId))?.locale ?? 'es'
      await reenviarAcesso({ userId, phone: p.phone, email, idioma: locale, nova: true, challengeId: getMappingForProduct(String(principal.produtoId))?.challengeId })
    }
    return { userId, criadaAgora: true, email, compradaEm: principal.aprovadaEm ?? principal.pedidoEm, produto: principal.produto }
  } catch (err) {
    console.error(`[acesso] conta pela compra falhou (${p.phone}):`, err)
    return null
  }
}

/** Senha nova + mensagem de acesso nesta conversa (usado pelo bot e pelo comando "reenvia o acesso"). Lança em erro. */
export async function reenviarAcesso(p: { userId: string; phone: string; email: string; idioma: string; nova?: boolean; challengeId?: string }): Promise<void> {
  const code = generateAccessCode()
  const { error } = await admin().auth.admin.updateUserById(p.userId, { password: code })
  if (error) throw new Error(error.message)
  const [acesso] = mensagensDeAcesso({ locale: p.idioma, email: p.email, code, link: buildAccessLink(APP_URL(), p.idioma, p.email, code), challengeId: p.challengeId })
  const msg = p.nova ? acesso : `${aberturaReenvio(p.idioma)}\n\n${acesso}`
  const destino = toZapiPhone(p.phone)
  const r = await sendZapiText({ phone: destino, message: msg, delayTyping: 2 })
  if (!r.ok) throw new Error(`senha trocada, mas o envio falhou: ${r.error}`)
  await registrarMensagem({ phone: destino, direction: 'out', author: 'system', body: msg.replaceAll(code, '••••••'), waMessageId: r.messageId })
  await marcarNaFila(p.phone, KIND_REENVIO, p.email)
}

/** Senha já renovada nas últimas 2 h nesta conversa (trava: reenviar de novo não resolve problema técnico). */
export async function reenvioRecente(phone: string): Promise<boolean> {
  const { count } = await admin()
    .from('whatsapp_outbox')
    .select('id', { count: 'exact', head: true })
    .in('phone', variantesTelefone(phone))
    .eq('kind', KIND_REENVIO)
    .gte('created_at', new Date(Date.now() - HORAS_TRAVA_REENVIO * 3_600_000).toISOString())
  return (count ?? 0) > 0
}

/**
 * Troca o e-mail de login. O antigo fica em user_metadata.emails_anteriores (a Hotmart continua registrando a compra nele:
 * as consultas de dinheiro olham os dois). A senha continua; quem chama reenvia o acesso com o e-mail novo.
 */
export async function trocarEmail(p: { userId: string; atual: string; novo: string }): Promise<{ ok: true } | { ok: false; erro: 'invalido' | 'igual' | 'ja-existe' | string }> {
  const novo = p.novo.trim().toLowerCase()
  if (!/^[\w.+-]+@[\w-]+(\.[\w-]+)+$/.test(novo)) return { ok: false, erro: 'invalido' }
  if (novo === p.atual.toLowerCase()) return { ok: false, erro: 'igual' }
  const db = admin()
  const { data: existe } = await db.from('users').select('id').ilike('email', novo).limit(1)
  if (existe?.length) return { ok: false, erro: 'ja-existe' }
  const { data: u } = await db.auth.admin.getUserById(p.userId)
  const meta = (u.user?.user_metadata ?? {}) as Record<string, unknown>
  const anteriores = [...new Set([...((meta.emails_anteriores as string[] | undefined) ?? []), p.atual.toLowerCase()])].filter(Boolean)
  const { error } = await db.auth.admin.updateUserById(p.userId, { email: novo, email_confirm: true, user_metadata: { ...meta, emails_anteriores: anteriores } })
  if (error) return { ok: false, erro: error.message }
  await db.from('users').update({ email: novo }).eq('id', p.userId)
  return { ok: true }
}

/** E-mail atual + anteriores (para consultar a Hotmart, que guarda a compra no e-mail de quando ela comprou). */
export async function emailsDaConta(userId: string): Promise<string[]> {
  const db = admin()
  const [{ data: u }, { data: auth }] = await Promise.all([db.from('users').select('email').eq('id', userId).maybeSingle(), db.auth.admin.getUserById(userId)])
  const atual = (u?.email as string | undefined)?.toLowerCase()
  const anteriores = ((auth?.user?.user_metadata?.emails_anteriores as string[] | undefined) ?? []).map((e) => e.toLowerCase())
  return [...new Set([atual, ...anteriores].filter((e): e is string => Boolean(e)))]
}

// Textos de contingência (no idioma dela; fora de es/pl/en cai em espanhol) quando o pedido não pôde ser atendido
// pelo bot e vai para uma pessoa — sem "sector responsable" (voz do atendimento, regra 6).
const VAMOS_VER: Record<string, string> = {
  es: 'Lo estoy revisando con el equipo y te confirmo por aquí hoy mismo.',
  pl: 'Sprawdzam to z zespołem i jeszcze dziś potwierdzę Ci tutaj.',
  en: "I'm checking this with the team and will confirm here today.",
}
const OLVIDASTE: Record<string, string> = {
  es: 'Para proteger tu cuenta, renueva la contraseña desde el inicio de sesión: toca «¿Olvidaste tu contraseña?», escribe el correo de la compra y sigue el enlace que te llega al correo.',
  pl: 'Dla bezpieczeństwa konta odnów hasło z ekranu logowania: kliknij „Nie pamiętasz hasła?”, wpisz e-mail z zakupu i otwórz link, który przyjdzie na ten e-mail.',
  en: "To protect your account, reset the password from the login screen: tap “Forgot your password?”, enter the purchase email and follow the link you receive by email.",
}
export const textoVamosVer = (idioma: string) => VAMOS_VER[idioma] ?? VAMOS_VER.es
export const textoOlvidaste = (idioma: string) => OLVIDASTE[idioma] ?? OLVIDASTE.es
