// LISTA DAS 20H unificada (Bruno, 05/11/2026, item 2 do plano do mapa do WhatsApp): consultas abertas + reembolsos
// aguardando numa mensagem só, uma vez por dia, no WhatsApp do responsável. Ele responde em texto livre ("#131 A",
// "#133 manda o link", "ok 1 2", "não 2") e o roteador por intenção (responder.ts) decide a que ele respondeu.
// Antes: cada transferência mandava um alerta na hora (152 alertas em outubro) e a lista de reembolsos ia separada.
// Agora a consulta comum nasce em silêncio e a aluna ouve "te respondo por aquí hoy hasta las 20h" (ou "mañana", depois
// das 19h de Brasília); só o que não pode esperar (chargeback, ameaça, erro do bot) avisa na hora.
import { admin, registrarMensagem } from './conversa'
import { linhasReembolsos } from './reembolsos'
import { sendZapiText, toZapiPhone } from '@/lib/zapi'
import { bandeira, nomeCurto, haQuanto, dataHoje, separaAcao, corta as cortaTexto } from './formato-lista'


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
  const partes: string[] = []
  // Formato (Bruno 08/11/2026): blocos curtos separados por linha em branco, negrito só em quem e no número, emoji de
  // seção e bandeira, o porquê em itálico; mesma informação de antes, sem linha comprida.
  const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`
  if (!reembolsos.length && !consultas.total) {
    partes.push(`✅ *Lista das 20h* · ${dataHoje()}`, '', 'Nada pendente: nenhuma consulta aberta nem reembolso aguardando.')
  } else {
    const resumo = [
      reembolsos.length ? `💸 ${plural(reembolsos.length, 'reembolso', 'reembolsos')}` : '',
      consultas.total ? `🟡 ${plural(consultas.total, 'consulta', 'consultas')}` : '',
      consultas.tecnicos ? `🔧 ${plural(consultas.tecnicos, 'ticket técnico', 'tickets técnicos')} (com o chat)` : '',
    ].filter(Boolean).join(' · ')
    partes.push(`📋 *Lista das 20h* · ${dataHoje()}`, resumo)
    if (reembolsos.length) {
      partes.push('', '💸 *REEMBOLSOS* · "ok 1 2" aprova · "não 2" recusa', '')
      partes.push(reembolsos.join('\n\n'))
    }
    if (consultas.total) {
      partes.push('', '🟡 *CONSULTAS* · "#141 A", "#141 B" ou escreva a resposta', '')
      const blocos: string[] = []
      for (const c of consultas.lista) {
        const { acao, resto } = separaAcao(c.resumo)
        const linhas = [`*#${c.id} · ${nomeCurto(c.nome)}* ${bandeira(String(c.phone))} · ${haQuanto(c.created_at)}`.replace(/\s+·/, ' ·')]
        if (acao) linhas.push(`🧭 *Ação:* ${cortaTexto(acao, 140)}`)
        const contexto = cortaTexto(resto || c.motivo, 220)
        if (contexto) linhas.push(`_${contexto}_`)
        if (c.opcao_a) linhas.push(`*A)* ${cortaTexto(c.opcao_a, 160)}`)
        if (c.opcao_b) linhas.push(`*B)* ${cortaTexto(c.opcao_b, 160)}`)
        blocos.push(linhas.join('\n'))
      }
      if (consultas.total > consultas.lista.length) blocos.push(`_+${consultas.total - consultas.lista.length} mais antigas; responda pelo #id._`)
      partes.push(blocos.join('\n\n'))
    }
    partes.push('', '_Uma resposta por mensagem. Sem resposta, seguem esperando._')
  }
  const msg = partes.join('\n')
  const r = await sendZapiText({ phone: destino, message: msg })
  if (!r.ok) {
    console.error('[lista-20h] envio falhou:', r.error)
    return null
  }
  await registrarMensagem({ phone: destino, direction: 'out', author: 'system', body: msg, waMessageId: r.messageId })
  return msg
}
