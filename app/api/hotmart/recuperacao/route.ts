import { NextRequest, NextResponse } from 'next/server'
import { agendarRecuperacao, cancelarRecuperacao, telefoneRecuperacao } from '@/lib/recuperacao-fila'
import { OFERTAS, PRODUTO_ID, casoDoEvento, linkCheckout, mensagem } from '@/lib/recuperacao'

// Webhook Hotmart EXCLUSIVO da recuperação de compra da CL-ES (14/10/2026). Separado de /api/hotmart (que cria conta e
// entrega acesso) para um erro aqui nunca atrapalhar a entrega. Regras comuns em lib/recuperacao-fila.ts; textos,
// oferta e link em lib/recuperacao.ts. Eventos que a Hotmart manda pra cá: PURCHASE_CANCELED, PURCHASE_BILLET_PRINTED,
// PURCHASE_EXPIRED, PURCHASE_APPROVED e PURCHASE_COMPLETE (aprovação apaga a recuperação que ainda não saiu).

const FALHAS = new Set(['PURCHASE_CANCELED', 'PURCHASE_BILLET_PRINTED', 'PURCHASE_EXPIRED'])
const APROVADA = new Set(['PURCHASE_APPROVED', 'PURCHASE_COMPLETE'])

interface Payload {
  event: string
  data?: {
    product?: { id?: number }
    buyer?: { email?: string; name?: string; checkout_phone?: string; phone?: string; address?: { country_iso?: string } }
    purchase?: {
      transaction?: string
      offer?: { code?: string }
      payment?: { type?: string }
      origin?: { sck?: string; src?: string; xcod?: string }
      order_bump?: { is_order_bump?: boolean }
      checkout_country?: { iso?: string }
    }
  }
}

export async function POST(request: NextRequest) {
  const token = process.env.HOTMART_WEBHOOK_TOKEN
  if (!token) return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  const recebido = request.headers.get('x-hotmart-hottok') ?? request.nextUrl.searchParams.get('hottok')
  if (recebido !== token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let p: Payload
  try {
    p = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { event, data } = p
  if (!FALHAS.has(event) && !APROVADA.has(event)) return NextResponse.json({ ok: true, skipped: 'evento' })
  const compra = data?.purchase
  // Só o front da CL-ES: pela oferta (upsell e downsell são outros produtos/ofertas) e sem order bump. NÃO filtrar por
  // is_funnel: a Hotmart marca true também a compra principal de um produto com Funil de Vendas (visto 14/10/2026).
  if (data?.product?.id !== PRODUTO_ID || !OFERTAS.has(compra?.offer?.code ?? '') || compra?.order_bump?.is_order_bump) {
    return NextResponse.json({ ok: true, skipped: 'fora do front CL-ES' })
  }

  const buyer = data?.buyer
  const email = buyer?.email?.toLowerCase()
  const phone = telefoneRecuperacao(buyer?.checkout_phone ?? buyer?.phone, {
    countryIso: buyer?.address?.country_iso ?? compra?.checkout_country?.iso,
  })

  if (APROVADA.has(event)) {
    await cancelarRecuperacao({ phone, email })
    return NextResponse.json({ ok: true })
  }

  const caso = casoDoEvento(event, compra?.payment?.type)
  if (!caso) return NextResponse.json({ ok: true, skipped: 'caso' })
  const link = linkCheckout({ email, nome: buyer?.name, src: compra?.origin?.src, sck: compra?.origin?.sck, xcod: compra?.origin?.xcod })
  const body = mensagem(caso, { nome: buyer?.name, tipoPagamento: compra?.payment?.type, link })
  const r = await agendarRecuperacao({ phone, email, body })
  if ('skipped' in r) return NextResponse.json({ ok: true, skipped: r.skipped })
  console.log(`[recuperacao] CL-ES enfileirada (${caso}, ${compra?.payment?.type}, venda ${compra?.transaction})`)
  return NextResponse.json({ ok: true, enfileirada: caso })
}
