// Email "Invita a una amiga" para a base CL-ES (Bruno, 19/10/2026). Mesmo programa do cartão no Início
// (lib/indicacao-link.ts): link próprio de cada aluna; amiga comprou → 1 mês do Pase para ela, dieta extra para a amiga.
// Envio aos poucos pelo cron da fila (processarEmailsIndicacao), DESLIGADO até EMAIL_INDICACAO_ATIVO=1.
// Só espanhol: Polônia exige consentimento prévio para email comercial (docs/indicacao.md). Tem descadastro.

import { createHmac } from 'node:crypto'
import { admin } from '@/lib/whatsapp-agent/conversa'
import { COPY_ES, linkIndicacao } from '@/lib/indicacao-link'

const KIND_ENVIO = 'email-indicacao' // linha inerte em whatsapp_outbox (phone = id da aluna): já recebeu
const KIND_BAIXA = 'email-baixa' // pediu para não receber emails
const POR_RODADA = 10 // cron a cada minuto → ~600/h; bem abaixo do limite de taxa da Resend
const APP = process.env.NEXT_PUBLIC_APP_URL ?? 'https://riseme.app'

export function assinaturaBaixa(userId: string): string {
  return createHmac('sha256', process.env.CRON_SECRET ?? '').update(`baixa:${userId}`).digest('hex').slice(0, 24)
}

export function emailIndicacao(p: { userId: string; nome?: string | null }): { subject: string; html: string; text: string } {
  const link = linkIndicacao(p.userId)
  const share = `https://wa.me/?text=${encodeURIComponent(COPY_ES.mensagem(link))}`
  const baixa = `${APP}/api/email/baixa?u=${p.userId}&t=${assinaturaBaixa(p.userId)}`
  const nome = (p.nome ?? '').trim().split(/\s+/)[0]
  const ola = nome ? `¡Hola, ${nome[0].toUpperCase()}${nome.slice(1).toLowerCase()}! 💛` : '¡Hola! 💛'
  const subject = 'Invita a una amiga y gana 1 mes de todos los desafíos 💛'
  const text = [
    ola,
    '',
    '¿Tienes una amiga que también quiere ponerse en forma en casa? Haz el reto con ella.',
    '',
    'Por cada amiga que compre con tu link, tú ganas 1 mes del Pase Completo con todos los desafíos (Pilates en la Pared, Yoga Facial, Yoga en la Silla y Cuerpo Sexy de Verano). Y ella se lleva de regalo una dieta personalizada.',
    '',
    `Compártelo por WhatsApp: ${share}`,
    '',
    `O copia tu link: ${link}`,
    '',
    'Cuando ella compre, te avisamos por WhatsApp y el regalo aparece solo en tu app.',
    '',
    `¿No quieres recibir más correos como este? ${baixa}`,
  ].join('\n')
  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f1ec;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">Tú ganas 1 mes de todos los desafíos y ella, una dieta personalizada.</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ec;padding:32px 16px;"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.06);">
      <tr><td style="background:#1a1a1a;padding:28px 32px;"><div style="color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">RiseMe</div></td></tr>
      <tr><td style="padding:32px;">
        <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;line-height:1.25;">${ola}</h1>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#555;">¿Tienes una amiga que también quiere ponerse en forma en casa? Haz el reto con ella.</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ec;border-radius:16px;"><tr><td style="padding:16px 18px;font-size:15px;line-height:1.5;">
          🎁 <strong>Tú ganas 1 mes del Pase Completo</strong> con todos los desafíos por cada amiga que compre con tu link.<br><br>
          💛 <strong>Ella se lleva de regalo</strong> una dieta personalizada.
        </td></tr></table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;"><tr><td align="center">
          <a href="${share}" style="display:block;background:#25D366;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:16px;border-radius:16px;text-align:center;">Invitar por WhatsApp</a>
        </td></tr></table>
        <p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:#777;">O copia tu link: <a href="${link}" style="color:#1a1a1a;word-break:break-all;">${link}</a></p>
        <p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:#777;">Cuando ella compre, te avisamos por WhatsApp y el regalo aparece solo en tu app.</p>
      </td></tr>
      <tr><td style="padding:20px 32px;border-top:1px solid #eee;"><p style="margin:0;font-size:12px;line-height:1.5;color:#bbb;">¿No quieres recibir más correos como este? <a href="${baixa}" style="color:#999;">Darme de baja</a></p></td></tr>
    </table>
  </td></tr></table>
</body></html>`
  return { subject, html, text }
}

export async function registrarBaixa(userId: string): Promise<void> {
  const agora = new Date().toISOString()
  await admin().from('whatsapp_outbox').insert({ phone: userId, kind: KIND_BAIXA, body: 'descadastro de email', send_after: agora, sent_at: agora, attempts: 5 })
}

/** Chamado pelo cron da fila. Envia até POR_RODADA emails, respeitando o teto diário (EMAIL_INDICACAO_POR_DIA). */
export async function processarEmailsIndicacao(): Promise<number> {
  if (process.env.EMAIL_INDICACAO_ATIVO !== '1') return 0
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return 0
  const db = admin()
  const teto = Number(process.env.EMAIL_INDICACAO_POR_DIA ?? '300')
  const hoje = new Date(); hoje.setUTCHours(0, 0, 0, 0)
  const { count: enviadosHoje } = await db.from('whatsapp_outbox').select('id', { count: 'exact', head: true }).eq('kind', KIND_ENVIO).gte('sent_at', hoje.toISOString())
  const restam = Math.min(POR_RODADA, teto - (enviadosHoje ?? 0))
  if (restam <= 0) return 0

  // Quem já recebeu ou pediu baixa (lista pequena: ~4 mil linhas no máximo).
  const fora = new Set<string>()
  for (let f = 0; ; f += 1000) {
    const { data } = await db.from('whatsapp_outbox').select('phone').in('kind', [KIND_ENVIO, KIND_BAIXA]).range(f, f + 999)
    for (const r of data ?? []) fora.add(r.phone)
    if ((data ?? []).length < 1000) break
  }
  // Compradoras do desafio, mais recentes primeiro (mais engajadas).
  const lote: { id: string; email: string; name: string | null }[] = []
  for (let f = 0; lote.length < restam; f += 200) {
    const { data: ucs } = await db.from('user_challenges').select('user_id').eq('challenge_id', '1').eq('access_type', 'lifetime').order('granted_at', { ascending: false }).range(f, f + 199)
    if (!ucs?.length) break
    const ids = ucs.map((u) => u.user_id).filter((id) => !fora.has(id))
    if (!ids.length) continue
    const { data: us } = await db.from('users').select('id, email, name, phone').in('id', ids)
    for (const u of us ?? []) {
      const tel = (u.phone ?? '').replace(/\D/g, '')
      if (tel.startsWith('48') || tel.startsWith('90') || tel.startsWith('420')) continue // PL (consentimento), TR, CZ
      lote.push(u)
      fora.add(u.id)
      if (lote.length >= restam) break
    }
  }

  const from = process.env.RESEND_FROM ?? 'RiseMe <acesso@riseme.app>'
  let n = 0
  for (const u of lote) {
    const e = emailIndicacao({ userId: u.id, nome: u.name })
    const baixa = `${APP}/api/email/baixa?u=${u.id}&t=${assinaturaBaixa(u.id)}`
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ from, to: [u.email], subject: e.subject, html: e.html, text: e.text, headers: { 'List-Unsubscribe': `<${baixa}>` } }),
    }).catch(() => null)
    if (!res?.ok) {
      // Falhou (cota/limite): para a rodada e não marca — o email de ACESSO usa a mesma Resend e tem prioridade.
      console.error(`[email-indicacao] envio falhou (${res?.status ?? 'rede'}): ${(await res?.text().catch(() => '')) ?? ''}`.slice(0, 300))
      break
    }
    const agora = new Date().toISOString()
    await db.from('whatsapp_outbox').insert({ phone: u.id, kind: KIND_ENVIO, body: u.email, send_after: agora, sent_at: agora, attempts: 5 })
    n++
  }
  return n
}
