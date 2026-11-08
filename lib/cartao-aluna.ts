// "Cartão da aluna": o que o agente de WhatsApp NÃO via até 05/11/2026 e passa a ver em toda mensagem (Bruno, 05/11:
// fechar o contexto). Compras (de onde, quanto, qual oferta, país), onde ela está em cada desafio, casos abertos
// (consulta pendente, reembolso aguardando, bot pausado), último contato humano e tamanho do histórico.
// As compras ficam em auth user_metadata.compras (gravadas pelos webhooks; backfill do dash em 05/11); o resto é lido na hora.
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { mockChallenges, challengeNameEs } from '@/lib/mock-challenges'

export interface CompraGuardada {
  plataforma: 'hotmart' | 'perfectpay'
  transacao: string
  produto: string
  oferta?: string | null
  valor?: number | null
  moeda?: string | null
  pais?: string | null
  em: string // ISO (pagamento)
}

const NOME: Record<string, string> = {
  ...Object.fromEntries(mockChallenges.map((c) => [c.id, challengeNameEs(c.id) ?? c.id])),
  'protocolo-metabolico': 'Protocolo Metabólico',
}

/** Acrescenta uma compra ao metadata (sem duplicar pela transação; guarda as 12 mais recentes). */
export async function registrarCompraNaConta(db: SupabaseClient, userId: string, compra: CompraGuardada, atual?: Record<string, unknown>): Promise<void> {
  const meta = atual ?? ((await db.auth.admin.getUserById(userId)).data.user?.user_metadata ?? {})
  const lista = ((meta.compras as CompraGuardada[] | undefined) ?? []).filter((c) => c.transacao !== compra.transacao)
  lista.push(compra)
  lista.sort((a, b) => (b.em ?? '').localeCompare(a.em ?? ''))
  await db.auth.admin.updateUserById(userId, { user_metadata: { ...meta, compras: lista.slice(0, 12) } })
}

const dias = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
const data = (iso?: string | null) => (iso ? iso.slice(0, 10) : '?')

/**
 * Texto do cartão para o perfil do agente. Variantes do telefone (com/sem 9, LID) vêm de quem chama.
 * Nunca lança: o que falhar fica de fora.
 */
export async function cartaoDaAluna(db: SupabaseClient, p: { userId: string; user?: User | null; variantes: string[] }): Promise<string> {
  const linhas: string[] = []
  const meta = (p.user?.user_metadata ?? {}) as Record<string, unknown>
  if (meta.manter_acesso) linhas.push('ACESSO MANTIDO por decisão da equipe, mesmo com reembolso (gentileza, 08/11/2026): o acesso dela NÃO será retirado. Se ela perguntar, confirme que fica; nunca diga que será revisado.')
  const compras = (meta.compras as CompraGuardada[] | undefined) ?? []
  if (compras.length) {
    linhas.push('Compras (o que ela pagou, de onde):')
    for (const c of compras.slice(0, 6)) {
      linhas.push(`- ${data(c.em)} (há ${dias(c.em)} dias) · ${c.produto}${c.oferta ? ` [oferta ${c.oferta}]` : ''} · ${c.valor != null ? `${c.valor} ${c.moeda ?? ''}` : 'valor ?'} · ${c.plataforma === 'hotmart' ? 'Hotmart' : 'Perfect Pay'}${c.pais ? ` · país ${c.pais}` : ''} · ${c.transacao}`)
    }
  }
  try {
    const [{ data: prog }, { data: consultas }, { data: cmds }, { data: chats }, { data: humano }, { count: total }, { data: primeira }] = await Promise.all([
      db.from('user_progress').select('challenge_id, day_number, completed_at').eq('user_id', p.userId).order('completed_at', { ascending: false }).limit(400),
      db.from('whatsapp_consultas').select('id, status, motivo, created_at, answered_at').in('phone', p.variantes).order('created_at', { ascending: false }).limit(5),
      db.from('whatsapp_comandos').select('params, created_at').eq('acao', 'reembolsar').eq('status', 'aguardando').limit(20),
      db.from('whatsapp_chats').select('mode, human_until, handoff_reason').in('phone', p.variantes),
      db.from('whatsapp_messages').select('body, created_at').in('phone', p.variantes).eq('author', 'human').order('created_at', { ascending: false }).limit(1),
      db.from('whatsapp_messages').select('id', { count: 'exact', head: true }).in('phone', p.variantes).eq('author', 'student'),
      db.from('whatsapp_messages').select('created_at').in('phone', p.variantes).eq('author', 'student').order('created_at', { ascending: true }).limit(1),
    ])
    // Onde ela está em cada desafio
    const porDesafio = new Map<string, { max: number; n: number; ultimo: string }>()
    for (const r of prog ?? []) {
      const d = porDesafio.get(r.challenge_id) ?? { max: 0, n: 0, ultimo: r.completed_at }
      d.max = Math.max(d.max, r.day_number ?? 0)
      d.n++
      if (r.completed_at > d.ultimo) d.ultimo = r.completed_at
      porDesafio.set(r.challenge_id, d)
    }
    if (porDesafio.size) {
      linhas.push('Onde ela está:')
      for (const [id, d] of porDesafio) linhas.push(`- ${NOME[id] ?? id}: concluiu até o dia ${d.max} (${d.n} dias feitos), último treino ${data(d.ultimo)} (há ${dias(d.ultimo)} dias)`)
    }
    // Casos abertos
    const abertas = (consultas ?? []).filter((c) => c.status === 'pendente')
    const reemb = (cmds ?? []).filter((c) => p.variantes.includes(String((c.params as { phone?: string })?.phone ?? '').replace(/\D/g, '')))
    const pausado = (chats ?? []).find((c) => c.mode === 'human' && (!c.human_until || new Date(c.human_until) > new Date()))
    const casos: string[] = []
    for (const c of abertas) casos.push(`consulta #${c.id} ABERTA com o setor desde ${data(c.created_at)} (${(c.motivo ?? '').slice(0, 90)}) — já está com uma pessoa; não transfira de novo, diga que seguem vendo`)
    for (const c of reemb) casos.push(`reembolso ${(c.params as { transacao?: string }).transacao ?? ''} REGISTRADO em ${data(c.created_at)}, aguardando aprovação (sai hoje) — não registre outro`)
    if (pausado) casos.push(`bot PAUSADO nesta conversa (${pausado.handoff_reason ?? 'pessoa atendendo'})`)
    const ultima = (consultas ?? []).find((c) => c.status !== 'pendente')
    if (ultima && dias(ultima.created_at) <= 21) casos.push(`última transferência: ${data(ultima.created_at)}, ${ultima.status}${ultima.answered_at ? ` em ${data(ultima.answered_at)}` : ''} (${(ultima.motivo ?? '').slice(0, 80)})`)
    if (casos.length) linhas.push('Casos:', ...casos.map((c) => `- ${c}`))
    // Contato humano e histórico
    if (humano?.[0]) linhas.push(`Último contato de uma PESSOA da equipe: ${data(humano[0].created_at)} — «${(humano[0].body ?? '').replace(/\s+/g, ' ').slice(0, 100)}»`)
    if (total) linhas.push(`Histórico: ${total} mensagens dela desde ${data(primeira?.[0]?.created_at)} (você vê só as últimas 30 abaixo).`)
  } catch (err) {
    console.error('[cartao-aluna] parte do cartão falhou:', err)
  }
  return linhas.length ? `CARTÃO DA ALUNA (dados reais do sistema, use como fato):\n${linhas.join('\n')}` : ''
}
