import { NextRequest, NextResponse } from 'next/server'
import { agendarRecuperacao, cancelarRecuperacao, telefoneRecuperacao } from '@/lib/recuperacao-fila'
import { PRODUTO_PP, STATUS_APROVADO, casoDoStatus, linkCheckoutPL, mensagemPL } from '@/lib/recuperacao-pl'

// Webhook Perfect Pay EXCLUSIVO da recuperação de compra da CL-PL (14/10/2026). Separado de /api/perfectpay (entrega
// de acesso). A PP valida pelo token DENTRO do payload. Cadastrar na PP (produto PPPBFHGM) com os status:
// precheckout (12), rejected (5), cancelled (6), expired (13), checkout_error (11), approved (2), completed (10).

interface Payload {
  token?: string
  code?: string
  sale_status_enum?: number
  payment_type_enum_key?: string
  customer?: { email?: string; full_name?: string; phone_number?: string; phone_formated?: string; phone_ddd?: string; phone_area_code?: string; country?: string }
  product?: { code?: string }
  metadata?: Record<string, unknown>
}

export async function POST(request: NextRequest) {
  const token = process.env.PERFECTPAY_WEBHOOK_TOKEN
  if (!token) return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  let p: Payload
  try {
    p = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (p.token !== token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (p.product?.code !== PRODUTO_PP) return NextResponse.json({ ok: true, skipped: 'fora do front CL-PL' })

  const c = p.customer
  const email = c?.email?.toLowerCase()
  // Mesma montagem do telefone da entrega de acesso (/api/perfectpay): DDD/área + número, senão o formatado.
  const area = c?.phone_area_code ?? c?.phone_ddd
  const raw = (area && c?.phone_number ? `${area}${c.phone_number}` : c?.phone_formated ?? c?.phone_number) ?? undefined
  const phone = telefoneRecuperacao(raw, { countryIso: c?.country, locale: 'pl' })
  const status = Number(p.sale_status_enum)

  if (STATUS_APROVADO.has(status)) {
    await cancelarRecuperacao({ phone, email })
    return NextResponse.json({ ok: true })
  }
  const caso = casoDoStatus(status)
  if (!caso) return NextResponse.json({ ok: true, skipped: `status ${status}` })
  const link = linkCheckoutPL(p.metadata)
  const body = mensagemPL(caso, { nome: c?.full_name, tipoPagamento: p.payment_type_enum_key, link })
  const r = await agendarRecuperacao({ phone, email, body })
  if ('skipped' in r) return NextResponse.json({ ok: true, skipped: r.skipped })
  console.log(`[recuperacao] CL-PL enfileirada (${caso}, ${p.payment_type_enum_key}, venda ${p.code})`)
  return NextResponse.json({ ok: true, enfileirada: caso })
}
