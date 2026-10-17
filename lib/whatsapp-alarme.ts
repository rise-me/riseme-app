// Alarme de conexão do WhatsApp do suporte (17/10/2026). Caso real: o celular desconectou da Z-API em
// 16/10 ~17h e ninguém viu por 18 h — 414 mensagens presas, 119 compradoras sem o acesso no WhatsApp.
// O cron da fila chama verificarConexao() a cada minuto; ela pergunta à Z-API a cada 5 min e, se a
// instância não estiver conectada, avisa por EMAIL (o WhatsApp é justamente o que caiu), 1x por hora.

import { admin } from '@/lib/whatsapp-agent/conversa'

const A_CADA_MIN = 5
const REPETIR_MS = 60 * 60_000
const KIND = 'alerta-conexao' // linha inerte em whatsapp_outbox (já nasce enviada): só marca quando avisou

async function statusZapi(): Promise<{ conectado: boolean; detalhe: string }> {
  const instance = process.env.ZAPI_INSTANCE_ID
  const token = process.env.ZAPI_TOKEN
  if (!instance || !token) return { conectado: true, detalhe: 'sem env' } // não configurado ≠ caiu
  const headers: Record<string, string> = {}
  if (process.env.ZAPI_CLIENT_TOKEN) headers['Client-Token'] = process.env.ZAPI_CLIENT_TOKEN
  try {
    const res = await fetch(`https://api.z-api.io/instances/${instance}/token/${token}/status`, { headers })
    const body = (await res.json().catch(() => ({}))) as { connected?: boolean; smartphoneConnected?: boolean; error?: string }
    if (!res.ok) return { conectado: false, detalhe: `status HTTP ${res.status}` }
    return { conectado: Boolean(body.connected), detalhe: body.error || (body.smartphoneConnected === false ? 'celular sem internet' : '') }
  } catch (err) {
    return { conectado: false, detalhe: String(err).slice(0, 120) }
  }
}

async function avisarPorEmail(detalhe: string, presas: number): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  const para = process.env.ALERTA_EMAIL
  if (!apiKey || !para) return false
  const from = process.env.RESEND_FROM ?? 'RiseMe <acesso@riseme.app>'
  const texto = [
    'O WhatsApp do suporte (Z-API) está DESCONECTADO.',
    detalhe ? `Detalhe: ${detalhe}` : '',
    `Mensagens que o servidor mandou e podem estar presas na fila da Z-API: ${presas} (última hora).`,
    '',
    'O que fazer: painel da Z-API → instância RiseMe (Suporte) → veja a fila. Se tiver muitas, "Limpar fila" ANTES',
    'de reconectar (senão saem todas de uma vez e o chip corre risco). Depois leia o QR Code com o celular do suporte',
    '(WhatsApp → Aparelhos conectados) e avise o Claude para reenviar o que ficou preso.',
  ].filter(Boolean).join('\n')
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ from, to: [para], subject: '⚠️ WhatsApp do suporte desconectado', text: texto }),
  }).catch(() => null)
  return Boolean(res?.ok)
}

export async function verificarConexao(): Promise<void> {
  if (new Date().getMinutes() % A_CADA_MIN !== 0) return
  const { conectado, detalhe } = await statusZapi()
  if (conectado) return
  const db = admin()
  const desde = new Date(Date.now() - REPETIR_MS).toISOString()
  const { count: jaAvisou } = await db.from('whatsapp_outbox').select('id', { count: 'exact', head: true }).eq('kind', KIND).gte('sent_at', desde)
  if (jaAvisou) return
  const { count: presas } = await db.from('whatsapp_outbox').select('id', { count: 'exact', head: true }).gte('sent_at', desde).not('kind', 'in', `(${KIND},reprocessar)`)
  const enviou = await avisarPorEmail(detalhe, presas ?? 0)
  console.error(`[alarme] WhatsApp desconectado (${detalhe}) — email ${enviou ? 'enviado' : 'NÃO enviado (falta ALERTA_EMAIL/RESEND?)'}`)
  const agora = new Date().toISOString()
  await db.from('whatsapp_outbox').insert({ phone: 'alarme', kind: KIND, body: `desconectado: ${detalhe}`, send_after: agora, sent_at: agora, attempts: 5 })
}
