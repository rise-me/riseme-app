// FILA TÉCNICA do suporte de WhatsApp (Bruno, 05/11/2026, item 3 do plano): tickets "TÉCNICO — …" abertos pelo bot vão
// para este chat (riseme), não para a lista das 20h. Uso, da raiz do repo:
//   npx tsx --env-file=.env.local scripts/fila-tecnica.ts                      → lista os tickets abertos com contexto
//   npx tsx --env-file=.env.local scripts/fila-tecnica.ts responder <id> "<texto no idioma dela>"  → manda e fecha
//   npx tsx --env-file=.env.local scripts/fila-tecnica.ts fechar <id>          → fecha sem mandar nada (resolvido por fora)
// O envio sai pela fila (whatsapp_outbox, kind 'manual'); a chave da Z-API só existe no servidor.
import { createClient } from '@supabase/supabase-js'
import { variantesTelefone } from '@/lib/whatsapp-agent/conversa'

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
const idade = (iso: string) => {
  const h = Math.round((Date.now() - new Date(iso).getTime()) / 3_600_000)
  return h >= 48 ? `há ${Math.floor(h / 24)} d` : `há ${h} h`
}

async function listar() {
  const { data } = await db.from('whatsapp_consultas').select('id, phone, nome, motivo, resumo, opcao_a, opcao_b, created_at').eq('status', 'pendente').ilike('motivo', 'TÉCNICO%').order('created_at')
  if (!data?.length) return console.log('Fila técnica vazia.')
  console.log(`${data.length} ticket(s) técnico(s) aberto(s)\n`)
  for (const c of data) {
    const formas = variantesTelefone(c.phone)
    const [{ data: chat }, { data: msgs }] = await Promise.all([
      db.from('whatsapp_chats').select('user_id').in('phone', formas).limit(1),
      db.from('whatsapp_messages').select('author, body, created_at').in('phone', formas).order('created_at', { ascending: false }).limit(10),
    ])
    let conta = 'sem conta ligada'
    // whatsapp_chats.user_id quase sempre vem vazio: cai na mesma busca do bot (users.phone com as variantes, ex. MX 521→52)
    let userId: string | null = chat?.[0]?.user_id ?? null
    if (!userId) {
      const { data: us } = await db.from('users').select('id').in('phone', formas.flatMap((v) => [`+${v}`, v])).limit(1)
      userId = us?.[0]?.id ?? null
    }
    if (userId) {
      const { data: u } = await db.from('users').select('email, name').eq('id', userId).maybeSingle()
      const { data: auth } = await db.auth.admin.getUserById(userId)
      conta = `${u?.email ?? '?'} · idioma ${auth?.user?.user_metadata?.locale ?? '?'} · último login ${auth?.user?.last_sign_in_at?.slice(0, 16) ?? 'nunca'}`
    }
    console.log(`━━━ #${c.id} · ${c.nome ?? 'sem nome'} · +${c.phone} · ${idade(c.created_at)}\n   conta: ${conta}\n   motivo: ${c.motivo}\n   resumo: ${(c.resumo ?? '').replace(/\s+/g, ' ')}`)
    for (const m of (msgs ?? []).reverse()) console.log(`   ${m.created_at.slice(5, 16)} ${m.author === 'student' ? 'ALUNA' : m.author.toUpperCase()}: ${(m.body ?? '').replace(/\s+/g, ' ').slice(0, 220)}`)
    console.log('')
  }
}

async function responder(id: number, texto: string) {
  const { data: c } = await db.from('whatsapp_consultas').select('id, phone, status').eq('id', id).maybeSingle()
  if (!c) throw new Error(`ticket #${id} não existe`)
  if (!texto.trim()) throw new Error('texto vazio')
  const agora = new Date().toISOString()
  const { error } = await db.from('whatsapp_outbox').insert({ phone: c.phone, kind: 'manual', body: texto, send_after: agora })
  if (error) throw new Error(error.message)
  await db.from('whatsapp_consultas').update({ status: 'respondida', orientacao: 'fila técnica (chat do riseme)', resposta_enviada: texto, answered_at: agora }).eq('id', id)
  await db.from('whatsapp_chats').update({ mode: 'bot', human_until: null, updated_at: agora }).eq('phone', c.phone)
  console.log(`#${id}: mensagem na fila para +${c.phone} e ticket fechado.`)
}

async function fechar(id: number) {
  await db.from('whatsapp_consultas').update({ status: 'pulada', orientacao: 'fila técnica: fechado sem resposta pelo bot', answered_at: new Date().toISOString() }).eq('id', id)
  console.log(`#${id} fechado.`)
}

const [cmd, id, ...resto] = process.argv.slice(2)
const run = cmd === 'responder' ? responder(Number(id), resto.join(' ')) : cmd === 'fechar' ? fechar(Number(id)) : listar()
run.catch((e) => {
  console.error(e)
  process.exit(1)
})
