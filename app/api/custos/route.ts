import { NextRequest, NextResponse } from 'next/server'
import { usoCloudflare, mensagemCusto } from '@/lib/custos/cloudflare'
import { sendZapiText } from '@/lib/zapi'

// GET /api/custos — cron diário da Vercel (vercel.json). Projeta o custo do mês na Cloudflare
// e manda WhatsApp para COST_ALERT_PHONE se passar de um limite (lib/custos/precos.ts);
// às segundas manda o resumo mesmo sem alerta, pra mostrar que o monitor está vivo.
// ?dry=1 devolve o cálculo sem enviar; ?forcar=1 envia o resumo mesmo sem alerta (teste).
// Mesmo CRON_SECRET do outbox.

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const phone = process.env.COST_ALERT_PHONE
  let uso
  try {
    uso = await usoCloudflare()
  } catch (err) {
    // Monitor quebrado também é alerta: sem isso ele morre em silêncio
    const msg = `⚠️ Monitor de custo da Cloudflare falhou: ${String(err).slice(0, 200)}`
    if (phone && !request.nextUrl.searchParams.has('dry')) await sendZapiText({ phone, message: msg })
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }

  const segunda = new Date().getUTCDay() === 1
  const enviar = uso.alertas.length > 0 || segunda || request.nextUrl.searchParams.has('forcar')
  const mensagem = mensagemCusto(uso)
  if (request.nextUrl.searchParams.has('dry') || !enviar) {
    return NextResponse.json({ ok: true, enviado: false, uso, mensagem })
  }
  if (!phone) return NextResponse.json({ ok: false, error: 'COST_ALERT_PHONE ausente', uso }, { status: 500 })
  const r = await sendZapiText({ phone, message: mensagem })
  console.log(`[custos] alertas=${uso.alertas.length} enviado=${r.ok}`)
  return NextResponse.json({ ok: r.ok, enviado: r.ok, uso })
}
