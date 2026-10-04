import { NextRequest, NextResponse } from 'next/server'
import { processarFila } from '@/lib/whatsapp-outbox'

// GET /api/whatsapp/outbox — cron da Vercel a cada minuto (vercel.json). Envia as
// mensagens de WhatsApp que já venceram na fila (lib/whatsapp-outbox.ts).
// A Vercel manda "Authorization: Bearer <CRON_SECRET>" quando a env existe.

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const r = await processarFila()
  if (r.enviados || r.falhas) console.log(`[outbox] enviados=${r.enviados} falhas=${r.falhas}`)
  return NextResponse.json({ ok: true, ...r })
}
