import { NextRequest, NextResponse } from 'next/server'
import { conferirVendas } from '@/lib/stripe-vendas'

// GET /api/stripe/conferencia — cron da Vercel a cada 15 min (vercel.json). Regra do Bruno (09/11/2026): nenhuma
// compradora da Stripe fica sem acesso. Entrega o que o webhook perdeu, reenvia canal que falhou e avisa o
// responsável no WhatsApp quando um canal não sai. Detalhe em lib/stripe-vendas.ts.

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const r = await conferirVendas()
  if (r.recuperadas || r.avisos) console.log(`[stripe] conferência: recuperadas=${r.recuperadas} avisos=${r.avisos} conferidas=${r.conferidas}`)
  return NextResponse.json({ ok: true, ...r })
}
