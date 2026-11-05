import { NextRequest, NextResponse } from 'next/server'
import { enviarListaDiaria } from '@/lib/whatsapp-agent/lista-20h'

// GET /api/whatsapp/reembolsos — cron da Vercel, todo dia 23:00 UTC (20h em Brasília), ver vercel.json.
// Manda ao responsável a LISTA DAS 20H unificada: consultas abertas + reembolsos aguardando (lib/whatsapp-agent/lista-20h.ts).
// Reembolso perto do dia 15 não espera esta hora: a lista sai na criação. A Vercel manda "Authorization: Bearer <CRON_SECRET>".

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const msg = await enviarListaDiaria()
    return NextResponse.json({ ok: true, enviada: Boolean(msg) })
  } catch (err) {
    console.error('[reembolsos] cron falhou:', err)
    return NextResponse.json({ ok: false, error: String(err).slice(0, 300) }, { status: 500 })
  }
}
