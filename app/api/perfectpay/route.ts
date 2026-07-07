import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { generateAccessCode, buildAccessLink } from '@/lib/access-code'
import { sendVoxuyAccess } from '@/lib/voxuy'
import { sendAccessEmail } from '@/lib/email'
import { toE164 } from '@/lib/phone'

const PERFECTPAY_TOKEN = process.env.PERFECTPAY_WEBHOOK_TOKEN

// sale_status_enum da Perfect Pay
const STATUS_APPROVED = 2
const STATUS_COMPLETED = 10 // 30 dias pós-aprovação — regrava idempotente
const REVOKE_STATUSES = new Set([6, 7, 9]) // cancelled, refunded, charged_back

interface PerfectPayPayload {
  token: string
  code: string // identificador da venda
  sale_status_enum: number
  sale_status_detail?: string
  customer: {
    email: string
    full_name?: string
    phone_number?: string
    phone_formated?: string
    phone_ddd?: string
    phone_area_code?: string // campo oficial da doc Perfect Pay (equivale ao DDD)
    country?: string // ISO-2 do país do comprador (ex.: "BR", "TR") — traz o DDI certo
  }
  product: { code: string; name?: string }
  plan?: { code?: string; name?: string }
}

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// PERFECTPAY_CHALLENGE_MAP="PRODUCT_CODE:challengeId:locale,..." — locale opcional (default es)
function getMappingForProduct(productCode: string): { challengeId: string; locale: string } | null {
  const map = process.env.PERFECTPAY_CHALLENGE_MAP ?? ''
  for (const entry of map.split(',')) {
    const [code, challengeId, locale] = entry.split(':')
    if (code?.trim() === productCode) {
      return { challengeId: challengeId?.trim() ?? '', locale: locale?.trim() || 'es' }
    }
  }
  return null
}

export async function POST(request: NextRequest) {
  // Fail closed: recusa tudo se o secret não estiver configurado.
  if (!PERFECTPAY_TOKEN) {
    console.error('[perfectpay] PERFECTPAY_WEBHOOK_TOKEN is not set — rejecting webhook')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  let payload: PerfectPayPayload
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Perfect Pay valida via token DENTRO do payload
  if (payload.token !== PERFECTPAY_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const status = payload.sale_status_enum
  const isGrant = status === STATUS_APPROVED || status === STATUS_COMPLETED
  const isRevoke = REVOKE_STATUSES.has(status)
  if (!isGrant && !isRevoke) {
    return NextResponse.json({ ok: true, skipped: `status ${status}` })
  }

  const buyerEmail = payload.customer?.email?.toLowerCase()
  const productCode = payload.product?.code
  if (!buyerEmail || !productCode) {
    return NextResponse.json({ error: 'Missing customer.email or product.code' }, { status: 400 })
  }

  // Produto não mapeado: loga alto e NÃO cria conta fantasma (padrão do bug Viviana).
  const mapping = getMappingForProduct(productCode)
  if (!mapping || !mapping.challengeId) {
    console.error(
      `[perfectpay] Produto NÃO MAPEADO: ${productCode} (venda ${payload.code}, ${buyerEmail}). ` +
        'Adicionar ao PERFECTPAY_CHALLENGE_MAP e reenviar o webhook.'
    )
    return NextResponse.json({ ok: true, skipped: `unmapped product ${productCode}` })
  }

  const supabase = createAdminClient()

  const { data: existingUsers } = await supabase
    .from('users')
    .select('id')
    .eq('email', buyerEmail)
    .limit(1)

  if (isGrant) {
    // Monta o número cru (área + número, ou o formatado) e normaliza pra E.164
    // com o DDI do país. Sem o "+DDI" a Voxuy assume Brasil e o número estrangeiro
    // vira inválido (bug comprovado com a turca Ömür em 2026-07-07).
    const areaCode = payload.customer.phone_area_code ?? payload.customer.phone_ddd
    const rawPhone = (areaCode && payload.customer.phone_number
      ? `${areaCode}${payload.customer.phone_number}`
      : payload.customer.phone_formated ?? payload.customer.phone_number) ?? undefined
    const { phone, hadCountry } = toE164(rawPhone, {
      countryIso: payload.customer.country,
      locale: mapping.locale,
    })
    if (rawPhone && !hadCountry) {
      console.warn(
        `[perfectpay] telefone sem país definido (venda ${payload.code}, country=${payload.customer.country ?? 'vazio'}, locale=${mapping.locale}) — enviado sem +DDI: ${phone}`
      )
    }
    // TEMP DEBUG (remover após validar): mostra o que a Perfect Pay realmente manda,
    // pra confirmar se o número chega inteiro no payload (nosso banco antigo veio truncado).
    console.log('[perfectpay][DEBUG-TEL]', JSON.stringify({
      venda: payload.code,
      country: payload.customer.country ?? null,
      phone_area_code: payload.customer.phone_area_code ?? null,
      phone_ddd: payload.customer.phone_ddd ?? null,
      phone_number: payload.customer.phone_number ?? null,
      phone_formated: payload.customer.phone_formated ?? null,
      normalizado: phone ?? null,
    }))

    let userId: string
    if (existingUsers && existingUsers.length > 0) {
      userId = existingUsers[0].id
    } else {
      // Conta JÁ ATIVA com código de acesso (senha inicial), entregue via Voxuy (WhatsApp).
      const code = generateAccessCode()
      const { data: created, error: createError } = await supabase.auth.admin.createUser({
        email: buyerEmail,
        password: code,
        email_confirm: true,
        user_metadata: { name: payload.customer.full_name, locale: mapping.locale },
      })
      if (createError || !created.user) {
        console.error('[perfectpay] Failed to create user:', createError)
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
      }
      userId = created.user.id
      if (phone) await supabase.from('users').update({ phone }).eq('id', userId)

      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
      const link = buildAccessLink(appUrl, mapping.locale, buyerEmail, code)
      // Entrega dupla, best-effort: WhatsApp (Voxuy) + email (Resend, contingência
      // que não depende de telefone). Se um falhar, o outro cobre.
      await sendVoxuyAccess({
        productCode,
        transactionId: payload.code,
        name: payload.customer.full_name,
        email: buyerEmail,
        phone,
        code,
        link,
      })
      await sendAccessEmail({ email: buyerEmail, code, link, locale: mapping.locale })
    }

    await supabase.from('user_challenges').upsert(
      { user_id: userId, challenge_id: mapping.challengeId, access_type: 'lifetime' },
      { onConflict: 'user_id,challenge_id', ignoreDuplicates: true }
    )
  }

  if (isRevoke) {
    if (!existingUsers || existingUsers.length === 0) {
      return NextResponse.json({ ok: true, skipped: 'user not found' })
    }
    await supabase
      .from('user_challenges')
      .delete()
      .eq('user_id', existingUsers[0].id)
      .eq('challenge_id', mapping.challengeId)
      .eq('access_type', 'lifetime')
  }

  return NextResponse.json({ ok: true })
}
