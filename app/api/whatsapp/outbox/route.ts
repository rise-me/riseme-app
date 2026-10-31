import { NextRequest, NextResponse } from 'next/server'
import { processarFila } from '@/lib/whatsapp-outbox'
import { verificarConexao } from '@/lib/whatsapp-alarme'
import { processarEmailsIndicacao } from '@/lib/email-indicacao'
import { convidarParaVideo } from '@/lib/video-depoimento'

// GET /api/whatsapp/outbox — cron da Vercel a cada minuto (vercel.json). Envia as
// mensagens de WhatsApp que já venceram na fila (lib/whatsapp-outbox.ts).
// A Vercel manda "Authorization: Bearer <CRON_SECRET>" quando a env existe.

export const dynamic = 'force-dynamic'
// 300: a linha 'revisao-semanal' (gatilho manual da revisão, lib/whatsapp-outbox.ts) chama o Claude e passa de 60 s.
export const maxDuration = 300

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // Alarme primeiro (falha dele nunca segura a fila): WhatsApp desconectado → email ao responsável.
  await verificarConexao().catch((err) => console.error('[alarme] falhou:', err))
  const r = await processarFila()
  // Email de indicação para a base (desligado até EMAIL_INDICACAO_ATIVO=1); falha nunca segura a fila do WhatsApp.
  const emails = await processarEmailsIndicacao().catch((err) => (console.error('[email-indicacao] falhou:', err), 0))
  if (emails) console.log(`[email-indicacao] enviados=${emails}`)
  // Convite de depoimento em vídeo para quem chegou a 7 dias de treino (1x/hora, poucas por vez).
  const videos = await convidarParaVideo().catch((err) => (console.error('[video-depoimento] convite falhou:', err), 0))
  if (videos) console.log(`[video-depoimento] convites=${videos}`)
  if (r.enviados || r.falhas) console.log(`[outbox] enviados=${r.enviados} falhas=${r.falhas}`)
  return NextResponse.json({ ok: true, ...r })
}
