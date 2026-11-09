import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { eventoAssinado } from '@/lib/stripe-api'
import { processarSessaoPaga, atualizarReembolso, registrarDisputa, tratarAvisoDeFraude } from '@/lib/stripe-vendas'

// POST /api/stripe — webhook da Stripe (conta da LLC). Endpoint criado pelo Bruno no painel (Desenvolvedores → Webhooks)
// com 7 eventos: checkout.session.completed, checkout.session.async_payment_succeeded, charge.refunded,
// charge.dispute.created, radar.early_fraud_warning.created, refund.updated, refund.failed.
// A lógica mora em lib/stripe-vendas.ts; aqui só valida a assinatura (corpo CRU) e roteia.
// Erro inesperado → 500 e a Stripe reenvia (até 3 dias). A entrega é idempotente pela sessão.

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const piDe = (x: string | { id: string } | null | undefined) => (typeof x === 'string' ? x : x?.id)

export async function POST(request: NextRequest) {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('[stripe] STRIPE_WEBHOOK_SECRET ausente — recusando webhook')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }
  const corpo = await request.text()
  let evento: Stripe.Event
  try {
    evento = eventoAssinado(corpo, request.headers.get('stripe-signature'))
  } catch (err) {
    console.error('[stripe] assinatura inválida:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (evento.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const r = await processarSessaoPaga(evento.data.object)
        console.log(`[stripe] ${evento.type} ${evento.data.object.id}: ${r.motivo}`)
        break
      }
      case 'charge.refunded': {
        const pi = piDe(evento.data.object.payment_intent)
        if (pi) await atualizarReembolso(pi)
        break
      }
      case 'refund.updated':
      case 'refund.failed': {
        const pi = piDe(evento.data.object.payment_intent)
        if (pi) await atualizarReembolso(pi)
        break
      }
      case 'charge.dispute.created':
        await registrarDisputa(evento.data.object)
        break
      case 'radar.early_fraud_warning.created':
        await tratarAvisoDeFraude(evento.data.object)
        break
      default:
        return NextResponse.json({ ok: true, ignorado: evento.type })
    }
  } catch (err) {
    console.error(`[stripe] ${evento.type} (${evento.id}) falhou:`, err)
    return NextResponse.json({ error: 'processing failed' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
