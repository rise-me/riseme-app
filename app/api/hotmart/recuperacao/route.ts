import { NextRequest, NextResponse } from 'next/server'
import { enfileirar, jaEnfileirou, pediuParaParar } from '@/lib/whatsapp-outbox'
import { admin, variantesTelefone } from '@/lib/whatsapp-agent/conversa'
import { toE164 } from '@/lib/phone'
import { toZapiPhone } from '@/lib/zapi'
import { ESPERA_MS, JANELA_MS, OFERTAS, PRODUTO_ID, casoDoEvento, linkCheckout, mensagem } from '@/lib/recuperacao'

// Webhook Hotmart EXCLUSIVO da recuperação de compra (14/10/2026). Separado de /api/hotmart (que cria conta e
// entrega acesso) para um erro aqui nunca atrapalhar a entrega. Regras e textos em lib/recuperacao.ts.
// Eventos que a Hotmart precisa mandar pra cá: PURCHASE_CANCELED, PURCHASE_BILLET_PRINTED, PURCHASE_EXPIRED,
// PURCHASE_APPROVED e PURCHASE_COMPLETE (aprovação apaga a recuperação que ainda não saiu).

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
      origin?: { sck?: string }
      is_funnel?: boolean
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
  const { phone: e164, hadCountry } = toE164(buyer?.checkout_phone ?? buyer?.phone, {
    countryIso: buyer?.address?.country_iso ?? compra?.checkout_country?.iso,
  })
  // Telefone na fila = só dígitos com DDI (toZapiPhone): é a chave da conversa, e o bot acha a mensagem por ela.
  const phone = e164 ? toZapiPhone(e164) : undefined
  const db = admin()

  if (APROVADA.has(event)) {
    // Pagou: apaga a recuperação que ainda não saiu (pelo telefone ou pelo email que está no link).
    const filtros = [
      ...(phone ? variantesTelefone(phone).map((v) => `phone.eq.${v}`) : []),
      email ? `body.ilike.%${encodeURIComponent(email)}%` : null,
    ].filter(Boolean)
    if (filtros.length) {
      await db.from('whatsapp_outbox').delete().eq('kind', 'recuperacao').is('sent_at', null).or(filtros.join(','))
    }
    return NextResponse.json({ ok: true })
  }

  if (!phone || !hadCountry) {
    console.warn(`[recuperacao] sem telefone internacional (venda ${compra?.transaction}) — ignorado`)
    return NextResponse.json({ ok: true, skipped: 'telefone' })
  }

  // Pediu para não receber mais (marcador gravado pelo bot do suporte) ou já recebeu acesso: não manda.
  if ((await pediuParaParar(phone)) || (await jaEnfileirou(phone, 'acesso'))) {
    return NextResponse.json({ ok: true, skipped: 'optout ou ja aluna' })
  }

  // Já é compradora (tem conta no app): não recebe recuperação.
  if (email) {
    const { count } = await db.from('users').select('id', { count: 'exact', head: true }).eq('email', email)
    if ((count ?? 0) > 0) return NextResponse.json({ ok: true, skipped: 'ja compradora' })
  }

  // 1 recuperação por número a cada 48 h (enviada ou na fila).
  const { count: recentes } = await db
    .from('whatsapp_outbox')
    .select('id', { count: 'exact', head: true })
    .eq('kind', 'recuperacao')
    .in('phone', variantesTelefone(phone))
    .gte('created_at', new Date(Date.now() - JANELA_MS).toISOString())
  if ((recentes ?? 0) > 0) return NextResponse.json({ ok: true, skipped: 'ja enfileirada' })

  const caso = casoDoEvento(event, compra?.payment?.type)
  if (!caso) return NextResponse.json({ ok: true, skipped: 'caso' })
  const link = linkCheckout({ email, nome: buyer?.name, sck: compra?.origin?.sck })
  const body = mensagem(caso, { nome: buyer?.name, tipoPagamento: compra?.payment?.type, link })
  await enfileirar({ phone, kind: 'recuperacao', body, sendAfter: new Date(Date.now() + ESPERA_MS) })
  console.log(`[recuperacao] enfileirada (${caso}, ${compra?.payment?.type}, venda ${compra?.transaction})`)
  return NextResponse.json({ ok: true, enfileirada: caso })
}
