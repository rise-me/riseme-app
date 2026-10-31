import { NextRequest, NextResponse } from 'next/server'
import { gerarRevisao } from '@/lib/revisao-semanal'

// GET /api/whatsapp/revisao — cron da Vercel, segunda 11:00 UTC (8h em Brasília), ver vercel.json.
// Gera a revisão semanal do atendimento (lib/revisao-semanal.ts) e manda por e-mail + aviso no WhatsApp do responsável.
// A Vercel manda "Authorization: Bearer <CRON_SECRET>" quando a env existe.

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const r = await gerarRevisao({ dias: 7 })
    console.log('[revisao-semanal]', JSON.stringify(r))
    return NextResponse.json(r)
  } catch (err) {
    console.error('[revisao-semanal] falhou:', err)
    return NextResponse.json({ ok: false, error: String(err).slice(0, 300) }, { status: 500 })
  }
}
