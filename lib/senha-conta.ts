// UMA senha por conta, para sempre (Bruno 18/11/2026: "Gera uma senha, e é essa senha. Se ela não trocar essa senha,
// até o dia que ela morrer, vai ser essa senha").
// Caso que criou a regra: aluna PL recebeu 4 senhas em 5 dias (cada reenvio de acesso gerava outra), tentou entrar com
// uma das antigas, viu "e-mail ou senha incorretos" e pediu reembolso.
// Regra: a senha de acesso nasce na compra e nós NUNCA mais geramos outra. Reenviar acesso = mandar a MESMA senha e
// gravá-la de novo na conta. Com isso, toda mensagem de acesso que ela já recebeu de nós continua certa, e se ela trocou
// por conta própria e esqueceu, volta a valer a de sempre (ela está pedindo acesso porque não consegue entrar).
// Onde a senha fica: linha inerte em whatsapp_outbox (kind 'senha-conta', phone = user_id, body = senha CIFRADA; a mais
// recente vale). Cifrada porque a fila apaga a senha da mensagem de acesso depois de enviar (coluna mask) justamente
// para não deixar senha legível no banco; a chave sai da chave de serviço, que já abre tudo.
// Quem cria conta chama guardarSenhaDaConta; a fila chama guardarSenhaDaMensagem quando a mensagem de acesso sai;
// quem reenvia chama senhaDaConta. Reenvio nenhum chama generateAccessCode.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'
import { generateAccessCode } from '@/lib/access-code'

export const KIND_SENHA_CONTA = 'senha-conta'
export type OrigemSenha = 'guardada' | 'venda-stripe' | 'mensagem-de-acesso' | 'gerada-agora'

function db(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
}

type Achada = { code: string; em: string; origem: OrigemSenha }

const chave = () => createHash('sha256').update(`senha-conta:${process.env.SUPABASE_SERVICE_ROLE_KEY}`).digest()
function cifrar(code: string): string {
  const iv = randomBytes(12)
  const c = createCipheriv('aes-256-gcm', chave(), iv)
  const ct = Buffer.concat([c.update(code, 'utf8'), c.final()])
  return ['v1', iv.toString('base64'), c.getAuthTag().toString('base64'), ct.toString('base64')].join(':')
}
function decifrar(guardado: string): string | null {
  try {
    const [v, iv, tag, ct] = guardado.split(':')
    if (v !== 'v1') return null
    const d = createDecipheriv('aes-256-gcm', chave(), Buffer.from(iv, 'base64'))
    d.setAuthTag(Buffer.from(tag, 'base64'))
    return Buffer.concat([d.update(Buffer.from(ct, 'base64')), d.final()]).toString('utf8')
  } catch {
    return null // chave de serviço trocada ou linha corrompida: tratada como "sem registro"
  }
}

async function guardada(c: SupabaseClient, userId: string): Promise<Achada | null> {
  const { data } = await c.from('whatsapp_outbox').select('body, created_at').eq('kind', KIND_SENHA_CONTA).eq('phone', userId).order('id', { ascending: false }).limit(1)
  const r = data?.[0]
  const code = r?.body ? decifrar(String(r.body)) : null
  return code ? { code, em: String(r!.created_at), origem: 'guardada' } : null
}

/** Venda da Stripe ainda em entrega (a coluna `codigo` é apagada depois que WhatsApp e e-mail saem). */
async function daVendaStripe(c: SupabaseClient, userId: string): Promise<Achada | null> {
  const { data } = await c.from('stripe_vendas').select('codigo, created_at').eq('user_id', userId).not('codigo', 'is', null).order('created_at', { ascending: false }).limit(1)
  const r = data?.[0]
  return r?.codigo ? { code: String(r.codigo), em: String(r.created_at), origem: 'venda-stripe' } : null
}

const LINK = /entrar\?e=([^&\s]+)&k=([a-z0-9]{6,20})(?![a-z0-9•])/i

/** A senha da ÚLTIMA mensagem de acesso montada para este e-mail e ainda NÃO enviada (regime "a pedido": fica em
 *  espera com a senha legível; depois de enviada a fila mascara e ela passa a vir do registro cifrado). Só a mais
 *  nova conta: se a mais nova já saiu e não há registro, a senha atual é desconhecida. */
async function daMensagemDeAcesso(c: SupabaseClient, email: string): Promise<Achada | null> {
  const e = encodeURIComponent(email.trim().toLowerCase())
  const { data } = await c.from('whatsapp_outbox').select('body, created_at').eq('kind', 'acesso').ilike('body', `%entrar?e=${e}&k=%`).order('id', { ascending: false }).limit(1)
  const r = data?.[0]
  const m = r ? String(r.body).match(LINK) : null
  return m && m[1].toLowerCase() === e.toLowerCase() ? { code: m[2], em: String(r!.created_at), origem: 'mensagem-de-acesso' } : null
}

/** A fila chama isto com o texto da mensagem de acesso ANTES de mascarar a senha (envio) ou de trocar o texto da linha:
 *  a senha que acabou de ser entregue passa a ser a de sempre desta conta. Nunca lança. */
export async function guardarSenhaDaMensagem(corpo: string): Promise<void> {
  try {
    const m = corpo.match(LINK)
    if (!m) return
    const email = decodeURIComponent(m[1]).toLowerCase()
    const { data } = await db().from('users').select('id').eq('email', email).limit(1)
    if (data?.[0]?.id) await guardarSenhaDaConta(String(data[0].id), m[2])
  } catch (err) {
    console.error('[senha-conta] não guardou a senha da mensagem de acesso:', err)
  }
}

/** Registra a senha com que a conta nasceu (webhooks de compra). Não repete se já é a que está guardada. */
export async function guardarSenhaDaConta(userId: string, code: string): Promise<void> {
  const c = db()
  const atual = await guardada(c, userId)
  if (atual?.code === code) return
  const agora = new Date().toISOString()
  const { error } = await c.from('whatsapp_outbox').insert({ phone: userId, kind: KIND_SENHA_CONTA, body: cifrar(code), send_after: agora, sent_at: agora, attempts: 5 })
  if (error) console.error(`[senha-conta] não guardou a senha de ${userId}:`, error.message)
}

/**
 * A senha de acesso desta conta, garantida: devolve a de sempre e a grava de novo no login (assim ela VALE, mesmo que
 * a aluna tenha trocado por conta própria ou que um reenvio antigo tenha deixado outra). Só gera uma senha quando não
 * existe registro de nenhuma (conta antiga, de antes desta regra) e, aí, essa passa a ser a de sempre. Lança em erro.
 */
export async function senhaDaConta(p: { userId: string; email: string }): Promise<{ code: string; origem: OrigemSenha }> {
  const c = db()
  const [g, s, m] = await Promise.all([guardada(c, p.userId), daVendaStripe(c, p.userId), daMensagemDeAcesso(c, p.email)])
  // Vale a mais RECENTE das três: se entrou uma compra nova depois do último registro (a rota da Stripe ainda dá senha
  // nova a quem já tinha conta), a senha que ela acabou de receber é a da venda ou a da mensagem em espera.
  const conhecidas = [g, s, m].filter((x): x is Achada => Boolean(x)).sort((a, b) => Date.parse(b.em) - Date.parse(a.em))
  const achada: Achada = conhecidas[0] ?? { code: generateAccessCode(), em: new Date().toISOString(), origem: 'gerada-agora' }

  const { error } = await c.auth.admin.updateUserById(p.userId, { password: achada.code })
  // "mesma senha de antes" não é erro aqui: é exatamente o que queremos.
  if (error && !/same_password|different from the old/i.test(`${(error as { code?: string }).code ?? ''} ${error.message}`)) throw new Error(error.message)
  if (g?.code !== achada.code) await guardarSenhaDaConta(p.userId, achada.code)
  return { code: achada.code, origem: achada.origem }
}
