import { NextRequest, NextResponse } from 'next/server'
import { enviarListaReembolsos } from '@/lib/whatsapp-agent/reembolsos'

// GET /api/whatsapp/reembolsos — cron da Vercel, todo dia 23:00 UTC (20h em Brasília), ver vercel.json.
// Manda ao responsável a lista numerada de reembolsos aguardando aprovação (lib/whatsapp-agent/reembolsos.ts).
// Pedido perto do dia 15 não espera esta hora: sai na criação. A Vercel manda "Authorization: Bearer <CRON_SECRET>".

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const msg = await enviarListaReembolsos()
    return NextResponse.json({ ok: true, enviada: Boolean(msg) })
  } catch (err) {
    console.error('[reembolsos] cron falhou:', err)
    return NextResponse.json({ ok: false, error: String(err).slice(0, 300) }, { status: 500 })
  }
}
