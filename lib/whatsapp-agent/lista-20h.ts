// LISTA DAS 20H unificada (Bruno, 05/11/2026, item 2 do plano do mapa do WhatsApp): consultas abertas + reembolsos
// aguardando numa mensagem só, uma vez por dia, no WhatsApp do responsável. Ele responde em texto livre ("#131 A",
// "#133 manda o link", "ok 1 2", "não 2") e o roteador por intenção (responder.ts) decide a que ele respondeu.
// Antes: cada transferência mandava um alerta na hora (152 alertas em outubro) e a lista de reembolsos ia separada.
// Agora a consulta comum nasce em silêncio e a aluna ouve "te respondo por aquí hoy hasta las 20h" (ou "mañana", depois
// das 19h de Brasília); só o que não pode esperar (chargeback, ameaça, erro do bot) avisa na hora.
import { admin, registrarMensagem } from './conversa'
import { linhasReembolsos } from './reembolsos'
import { sendZapiText } from '@/lib/zapi'

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
async function consultasAbertas() {
  const { data, count } = await admin()
    .from('whatsapp_consultas')
    .select('id, phone, nome, motivo, resumo, opcao_a, opcao_b, created_at', { count: 'exact' })
    .eq('status', 'pendente')
    .order('created_at', { ascending: true })
    .limit(MAX_CONSULTAS)
  return { lista: data ?? [], total: count ?? data?.length ?? 0 }
}

/** Monta e manda a lista unificada. Devolve o texto enviado (null = sem destino ou envio falhou). */
export async function enviarListaDiaria(): Promise<string | null> {
  const destino = (process.env.WHATSAPP_HANDOFF_PHONE ?? '').replace(/\D/g, '')
  if (!destino) return null
  const [reembolsos, consultas] = await Promise.all([linhasReembolsos(), consultasAbertas()])
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
          `*#${c.id}* · ${c.nome || 'aluna sem conta'} (${idade(c.created_at)}) +${String(c.phone).replace('@lid', ' · sem número')}`,
          `   ${corta(c.resumo || c.motivo, 260)}`,
          ...(c.opcao_a ? [`   *A)* ${corta(c.opcao_a, 180)}`] : []),
          ...(c.opcao_b ? [`   *B)* ${corta(c.opcao_b, 180)}`] : []),
        )
      }
      if (consultas.total > consultas.lista.length) partes.push(`   (+${consultas.total - consultas.lista.length} mais antigas; responda pelo #id)`)
    }
    partes.push('', 'Responda livre, uma por mensagem: "ok 1 2", "não 2", "#131 A", "#133 manda o link e pede o print". Sem resposta, elas seguem esperando.')
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
