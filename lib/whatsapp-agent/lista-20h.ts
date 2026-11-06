// LISTA DAS 20H unificada (Bruno, 05/11/2026, item 2 do plano do mapa do WhatsApp): consultas abertas + reembolsos
// aguardando numa mensagem só, uma vez por dia, no WhatsApp do responsável. Ele responde em texto livre ("#131 A",
// "#133 manda o link", "ok 1 2", "não 2") e o roteador por intenção (responder.ts) decide a que ele respondeu.
// Antes: cada transferência mandava um alerta na hora (152 alertas em outubro) e a lista de reembolsos ia separada.
// Agora a consulta comum nasce em silêncio e a aluna ouve "te respondo por aquí hoy hasta las 20h" (ou "mañana", depois
// das 19h de Brasília); só o que não pode esperar (chargeback, ameaça, erro do bot) avisa na hora.
import { admin, registrarMensagem, variantesTelefone } from './conversa'
import { linhasReembolsos } from './reembolsos'
import { marcarNaFila } from '@/lib/whatsapp-outbox'
import { sendZapiText, toZapiPhone } from '@/lib/zapi'
import { horaLocal } from '@/lib/video-depoimento'

export const KIND_ADIADA = 'consulta-adiada' // linha inerte: body = id da consulta avisada às 21h

const MAX_CONSULTAS = 20

// Hora limite (Brasília) até a qual uma transferência ainda entra na lista de HOJE. Depois disso o bot promete "mañana".
export const HORA_CORTE_BRT = 19

/** "hoy" ou "mañana": a lista das 20h (Brasília) ainda sai hoje para o que chegou antes das 19h. */
export function prazoDaLista(agoraIso: string): 'hoje' | 'amanha' {
  const brt = new Date(new Date(agoraIso).getTime() - 3 * 3_600_000)
  return brt.getUTCHours() < HORA_CORTE_BRT ? 'hoje' : 'amanha'
}

const h = (iso: string) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 3_600_000))
const idade = (iso: string) => (h(iso) >= 48 ? `há ${Math.floor(h(iso) / 24)} d` : `há ${h(iso)} h`)
const corta = (t: string | null | undefined, n: number) => {
  const s = (t ?? '').replace(/\s+/g, ' ').trim()
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

/** Consultas pendentes (todas, da mais antiga para a mais nova; as mais velhas que o teto ficam só contadas). */
// Tickets técnicos ("TÉCNICO — …") ficam na fila técnica (scripts/fila-tecnica.ts), não nesta lista: só o total aparece.
async function consultasAbertas() {
  const [{ data, count }, { count: tecnicos }] = await Promise.all([
    admin()
      .from('whatsapp_consultas')
      .select('id, phone, nome, motivo, resumo, opcao_a, opcao_b, created_at', { count: 'exact' })
      .eq('status', 'pendente')
      .not('motivo', 'ilike', 'TÉCNICO%')
      .order('created_at', { ascending: true })
      .limit(MAX_CONSULTAS),
    admin().from('whatsapp_consultas').select('id', { count: 'exact', head: true }).eq('status', 'pendente').ilike('motivo', 'TÉCNICO%'),
  ])
  return { lista: data ?? [], total: count ?? data?.length ?? 0, tecnicos: tecnicos ?? 0 }
}

/** Monta e manda a lista unificada. Devolve o texto enviado (null = sem destino ou envio falhou). */
export async function enviarListaDiaria(): Promise<string | null> {
  const destino = (process.env.WHATSAPP_HANDOFF_PHONE ?? '').replace(/\D/g, '')
  if (!destino) return null
  const [reembolsos, consultas] = await Promise.all([linhasReembolsos(), consultasAbertas()])
  const { data: adiadas } = await admin().from('whatsapp_outbox').select('body').eq('kind', KIND_ADIADA).in('body', consultas.lista.map((c) => String(c.id)))
  const avisadas = new Set((adiadas ?? []).map((r) => r.body))
  const partes: string[] = []
  if (!reembolsos.length && !consultas.total) {
    partes.push('✅ *Lista das 20h*: nada pendente. Nenhuma consulta aberta nem reembolso aguardando.')
  } else {
    partes.push(`📋 *Lista das 20h* — ${reembolsos.length} reembolso(s) · ${consultas.total} consulta(s)`)
    if (reembolsos.length) partes.push('', '💸 *Reembolsos* (aprovado = reembolso na Hotmart pela API + aviso à aluna)', ...reembolsos)
    if (consultas.total) {
      partes.push('', '🟡 *Consultas* (responda "#id A", "#id B" ou "#id <o que responder>"; eu escrevo no idioma dela)')
      for (const c of consultas.lista) {
        partes.push(
          `*#${c.id}* · ${c.nome || 'aluna sem conta'} (${idade(c.created_at)}) +${String(c.phone).replace('@lid', ' · sem número')}${avisadas.has(String(c.id)) ? ' ⚠️ *ela já ouviu "te escribo mañana"*' : ''}`,
          `   ${corta(c.resumo || c.motivo, 260)}`,
          ...(c.opcao_a ? [`   *A)* ${corta(c.opcao_a, 180)}`] : []),
          ...(c.opcao_b ? [`   *B)* ${corta(c.opcao_b, 180)}`] : []),
        )
      }
      if (consultas.total > consultas.lista.length) partes.push(`   (+${consultas.total - consultas.lista.length} mais antigas; responda pelo #id)`)
    }
    partes.push('', 'Responda livre, uma por mensagem: "ok 1 2", "não 2", "#131 A", "#133 manda o link e pede o print". Sem resposta, elas seguem esperando.')
  }
  if (consultas.tecnicos) partes.push('', `🔧 ${consultas.tecnicos} ticket(s) técnico(s) na fila do chat do riseme (não precisam de você).`)
  const msg = partes.join('\n')
  const r = await sendZapiText({ phone: destino, message: msg })
  if (!r.ok) {
    console.error('[lista-20h] envio falhou:', r.error)
    return null
  }
  await registrarMensagem({ phone: destino, direction: 'out', author: 'system', body: msg, waMessageId: r.messageId })
  return msg
}

// ─── 21h: ninguém fica no vácuo (p1 + p5 do mapa, 05/11/2026) ──────────────────────────────────────────────────────────────
// O bot prometeu "te respondo hoy hasta las 20h". Consulta que entrou na lista de hoje e segue sem resposta às 21h (Brasília)
// → a aluna recebe UMA linha honesta ("seguimos revisando, te escribo mañana"), uma vez por consulta, e a lista do dia
// seguinte mostra ⚠️. Tickets técnicos ficam de fora (a promessa deles é outra).
const ADIADA: Record<string, string> = {
  es: 'Seguimos revisando tu caso y aún no tengo la respuesta. Te escribo mañana por aquí, sin falta. Gracias por la paciencia.',
  pl: 'Nadal sprawdzamy Twoją sprawę i nie mam jeszcze odpowiedzi. Napiszę do Ciebie jutro, na pewno. Dziękuję za cierpliwość.',
  it: 'Stiamo ancora verificando il tuo caso e non ho ancora la risposta. Ti scrivo domani qui, senza falta. Grazie per la pazienza.',
  cs: 'Tvůj případ stále řešíme a odpověď ještě nemám. Napíšu ti zítra, určitě. Díky za trpělivost.',
  tr: 'Durumunu hâlâ inceliyoruz ve henüz yanıtım yok. Yarın mutlaka buradan yazacağım. Sabrın için teşekkürler.',
  en: "We're still looking into your case and I don't have the answer yet. I'll write to you here tomorrow, for sure. Thanks for your patience.",
  ro: 'Încă verificăm cazul tău și nu am încă răspunsul. Îți scriu mâine aici, sigur. Mulțumesc pentru răbdare.',
  'pt-BR': 'Ainda estamos vendo o seu caso e não tenho a resposta. Te escrevo amanhã por aqui, sem falta. Obrigada pela paciência.',
}
const idiomaPeloDdi = (phone: string) => (/^48/.test(phone) ? 'pl' : /^90/.test(phone) ? 'tr' : /^420/.test(phone) ? 'cs' : /^39/.test(phone) ? 'it' : /^40/.test(phone) ? 'ro' : /^55/.test(phone) ? 'pt-BR' : 'es')

export async function avisarConsultasSemResposta(): Promise<{ avisadas: number[] }> {
  const db = admin()
  // Só consulta aberta HOJE antes das 19h BRT: é a única que ouviu "te respondo hoy hasta las 20h". Consulta de dias atrás
  // não ganha "te escribo mañana" (05/11/2026: 6 alunas com consulta de 2 a 5 dias receberam a linha, uma delas à 1h da
  // manhã na Espanha, outra que o responsável tinha mandado NÃO responder). Essas são problema da lista das 20h, não dela.
  const agora = new Date()
  const fim = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate(), 22, 0, 0)) // 19h BRT
  if (fim > agora) fim.setUTCDate(fim.getUTCDate() - 1)
  const inicio = new Date(fim); inicio.setUTCHours(3, 0, 0, 0) // 0h BRT do mesmo dia
  const { data } = await db.from('whatsapp_consultas').select('id, phone').eq('status', 'pendente').not('motivo', 'ilike', 'TÉCNICO%').gte('created_at', inicio.toISOString()).lt('created_at', fim.toISOString()).order('created_at')
  const lista = data ?? []
  if (!lista.length) return { avisadas: [] }
  const { data: ja } = await db.from('whatsapp_outbox').select('body').eq('kind', KIND_ADIADA).in('body', lista.map((c) => String(c.id)))
  const jaAvisadas = new Set((ja ?? []).map((r) => r.body))
  const avisadas: number[] = []
  for (const c of lista) {
    if (jaAvisadas.has(String(c.id))) continue
    const phone = String(c.phone)
    const { data: chat } = await db.from('whatsapp_chats').select('user_id, mode, human_until').in('phone', variantesTelefone(phone)).limit(1)
    if (chat?.[0]?.mode === 'human' && (!chat[0].human_until || new Date(chat[0].human_until) > agora)) continue // pessoa atendendo
    const hora = horaLocal(phone.replace(/\D/g, ''))
    if (hora < 8 || hora >= 22) continue // madrugada lá: não acorda ninguém pra dizer que não tem resposta
    const { data: recente } = await db.from('whatsapp_messages').select('id').in('phone', variantesTelefone(phone)).eq('direction', 'out').gte('created_at', new Date(agora.getTime() - 3600_000).toISOString()).limit(1)
    if (recente?.length) continue // ela ouviu de nós na última hora: mais uma linha é ruído
    let idioma = idiomaPeloDdi(phone)
    if (chat?.[0]?.user_id) {
      const { data: u } = await db.auth.admin.getUserById(chat[0].user_id)
      idioma = (u.user?.user_metadata?.locale as string | undefined) ?? idioma
    }
    const texto = ADIADA[idioma] ?? ADIADA.es
    const r = await sendZapiText({ phone: toZapiPhone(phone), message: texto, delayTyping: 2 })
    if (!r.ok) { console.error(`[21h] aviso falhou (#${c.id}, ${phone}):`, r.error); continue }
    await registrarMensagem({ phone: toZapiPhone(phone), direction: 'out', author: 'agent', body: texto, waMessageId: r.messageId })
    await marcarNaFila(phone, KIND_ADIADA, String(c.id))
    avisadas.push(c.id)
  }
  return { avisadas }
}
