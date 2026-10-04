// Estado e histórico das conversas de WhatsApp (migration_008). Só servidor:
// usa a service role — as tabelas não têm policy nenhuma.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { MensagemConversa, PerfilAluna } from './responder'

let _admin: SupabaseClient | null = null
function admin(): SupabaseClient {
  if (!_admin) {
    _admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }
  return _admin
}

export type Autor = MensagemConversa['autor']

/** Grava uma mensagem. Retorna false se o wa_message_id já existia (webhook repetido). */
export async function registrarMensagem(m: {
  phone: string
  direction: 'in' | 'out'
  author: Autor
  body: string
  waMessageId?: string
}): Promise<boolean> {
  const { error } = await admin().from('whatsapp_messages').insert({
    phone: m.phone,
    direction: m.direction,
    author: m.author,
    body: m.body,
    wa_message_id: m.waMessageId || null,
  })
  if (error?.code === '23505') return false // unique violation = já processada
  if (error) console.error('[whatsapp] falha ao gravar mensagem:', error.message)
  return true
}

export async function mensagemJaRegistrada(waMessageId: string): Promise<boolean> {
  const { data } = await admin()
    .from('whatsapp_messages')
    .select('id')
    .eq('wa_message_id', waMessageId)
    .limit(1)
  return Boolean(data && data.length > 0)
}

/** wa_message_id da última mensagem que a aluna mandou — pra juntar mensagens em sequência. */
export async function ultimaEntrada(phone: string): Promise<string | null> {
  const { data } = await admin()
    .from('whatsapp_messages')
    .select('wa_message_id')
    .eq('phone', phone)
    .eq('direction', 'in')
    .order('created_at', { ascending: false })
    .limit(1)
  return data?.[0]?.wa_message_id ?? null
}

export async function historico(phone: string, limite = 30): Promise<MensagemConversa[]> {
  const { data } = await admin()
    .from('whatsapp_messages')
    .select('author, body, created_at')
    .eq('phone', phone)
    .order('created_at', { ascending: false })
    .limit(limite)
  return (data ?? [])
    .reverse()
    .map((r) => ({ autor: r.author as Autor, texto: r.body as string, em: r.created_at as string }))
}

export interface Chat {
  phone: string
  userId: string | null
  modoHumano: boolean // true = bot calado (pessoa assumiu ou handoff)
}

async function acharUsuario(phone: string): Promise<string | null> {
  // users.phone é gravado em E.164 ("+34…") pela Perfect Pay; a Hotmart pode ter gravado cru.
  // Celular BR: o WhatsApp devolve o número SEM o 9 (55 31 8991-1328), a compra grava COM.
  const variantes = [phone]
  if (/^55\d{10}$/.test(phone)) variantes.push(`${phone.slice(0, 4)}9${phone.slice(4)}`)
  const candidatos = variantes.flatMap((v) => [`+${v}`, v])
  const { data } = await admin().from('users').select('id').in('phone', candidatos).limit(1)
  return data?.[0]?.id ?? null
}

export async function abrirChat(phone: string): Promise<Chat> {
  const { data } = await admin()
    .from('whatsapp_chats')
    .select('user_id, mode, human_until')
    .eq('phone', phone)
    .maybeSingle()

  if (!data) {
    const userId = await acharUsuario(phone)
    await admin().from('whatsapp_chats').insert({ phone, user_id: userId })
    return { phone, userId, modoHumano: false }
  }

  const pausado = data.mode === 'human' && (!data.human_until || new Date(data.human_until) > new Date())
  if (data.mode === 'human' && !pausado) {
    await admin().from('whatsapp_chats').update({ mode: 'bot', human_until: null, updated_at: new Date().toISOString() }).eq('phone', phone)
  }
  return { phone, userId: data.user_id ?? (await acharUsuario(phone)), modoHumano: pausado }
}

/** Cala o bot neste número por `horas` (pessoa assumiu ou o agente pediu handoff). */
export async function passarParaHumano(phone: string, horas: number, motivo: string): Promise<void> {
  await admin()
    .from('whatsapp_chats')
    .upsert({
      phone,
      mode: 'human',
      human_until: new Date(Date.now() + horas * 3600_000).toISOString(),
      handoff_reason: motivo,
      updated_at: new Date().toISOString(),
    })
}

export async function perfilDaAluna(userId: string): Promise<PerfilAluna | null> {
  const db = admin()
  const [{ data: u }, { data: auth }, { data: progresso }] = await Promise.all([
    db.from('users').select('name, created_at').eq('id', userId).maybeSingle(),
    db.auth.admin.getUserById(userId),
    db
      .from('user_progress')
      .select('completed_at')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false }),
  ])
  if (!u) return null
  return {
    nome: u.name ?? undefined,
    idioma: (auth?.user?.user_metadata?.locale as string) ?? 'es',
    compradaEm: u.created_at,
    ultimoLogin: auth?.user?.last_sign_in_at ?? null,
    diasFeitos: progresso?.length ?? 0,
    ultimoTreino: progresso?.[0]?.completed_at ?? null,
  }
}
