import { NextRequest, NextResponse } from 'next/server'
import { avisarConsultasSemResposta } from '@/lib/whatsapp-agent/lista-20h'

// GET /api/whatsapp/fechamento — cron da Vercel, todo dia 00:00 UTC (21h em Brasília), ver vercel.json.
// Consulta que estava na lista das 20h e segue sem resposta → a aluna recebe uma linha honesta ("te escribo mañana"),
// uma vez por consulta (lib/whatsapp-agent/lista-20h.ts, p1 + p5 do mapa). A Vercel manda "Authorization: Bearer <CRON_SECRET>".

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const r = await avisarConsultasSemResposta()
    return NextResponse.json({ ok: true, ...r })
  } catch (err) {
    console.error('[fechamento] cron falhou:', err)
    return NextResponse.json({ ok: false, error: String(err).slice(0, 300) }, { status: 500 })
  }
}
