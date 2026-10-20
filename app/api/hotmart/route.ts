import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { generateAccessCode, buildAccessLink } from '@/lib/access-code'
import { sendWhatsAppAccess } from '@/lib/whatsapp-access'
import { sendAccessEmail } from '@/lib/email'
import { toE164 } from '@/lib/phone'
import { routing } from '@/i18n/routing'
import { hasLocale } from 'next-intl'
import { indicadoraDoSrc } from '@/lib/indicacao-link'
import { darPaseDeIndicacao } from '@/lib/whatsapp-agent/indicacao'
import { darCardapioBonus } from '@/lib/diet/quota'
import { enfileirar } from '@/lib/whatsapp-outbox'
import { deveRevogar, registrarCompra } from '@/lib/compras'


const HOTMART_TOKEN = process.env.HOTMART_WEBHOOK_TOKEN

// Offer codes (parâmetro ?off=) — a Hotmart envia em data.purchase.offer.code
// Cada env aceita lista separada por vírgula: ofertas antigas e novas convivem
// (assinantes do preço antigo continuam tendo cancelamento/reembolso processados).
function parseOfferList(value?: string): Set<string> {
  return new Set((value ?? '').split(',').map((s) => s.trim()).filter(Boolean))
}
const MONTHLY_OFFERS = parseOfferList(process.env.HOTMART_OFFER_MONTHLY)
const ANNUAL_OFFERS = parseOfferList(process.env.HOTMART_OFFER_ANNUAL)
const TRIAL_ANNUAL_OFFERS = parseOfferList(process.env.HOTMART_OFFER_TRIAL_ANNUAL)
const SUBSCRIPTION_OFFERS = new Set([
  ...MONTHLY_OFFERS,
  ...ANNUAL_OFFERS,
  ...TRIAL_ANNUAL_OFFERS,
])

type HotmartEvent =
  | 'PURCHASE_APPROVED'
  | 'PURCHASE_COMPLETE'
  | 'SUBSCRIPTION_CANCELLATION'
  | 'PURCHASE_REFUNDED'
  | string

interface HotmartPayload {
  event: HotmartEvent
  data: {
    product?: { id: number; ucode: string; name: string }
    buyer?: {
      email: string
      name: string
      checkout_phone?: string
      phone?: string
      address?: { country_iso?: string } // ISO-2 do país do comprador → DDI
    }
    // SUBSCRIPTION_CANCELLATION não traz buyer/purchase: vem subscriber (email + code).
    subscriber?: { code?: string; email?: string }
    purchase?: {
      transaction: string
      status: string
      offer?: { code: string }
      recurrence_number?: number
      date_next_charge?: number // epoch ms da próxima cobrança (no teste grátis = fim do teste)
      origin?: { src?: string; sck?: string; xcod?: string } // rastreio do link (src=ind-<id> = indicação)
    }
    subscription?: {
      subscriber: { code: string }
      plan: { name: string }
      status: string
    }
  }
}

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(request: NextRequest) {
  // Fail closed: refuse all webhooks if the secret isn't configured.
  if (!HOTMART_TOKEN) {
    console.error('[hotmart] HOTMART_WEBHOOK_TOKEN is not set — rejecting webhook')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  // Accept token via header (preferred — doesn't leak in logs) or query string (legacy).
  const headerToken = request.headers.get('x-hotmart-hottok')
  const queryToken = request.nextUrl.searchParams.get('hottok')
  const token = headerToken ?? queryToken
  if (token !== HOTMART_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: HotmartPayload
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { event, data } = payload
  const supabase = createAdminClient()

  if (!['PURCHASE_APPROVED', 'PURCHASE_COMPLETE', 'SUBSCRIPTION_CANCELLATION', 'PURCHASE_REFUNDED', 'PURCHASE_CHARGEBACK'].includes(event)) {
    return NextResponse.json({ ok: true, skipped: true })
  }

  const buyerEmail = (data.buyer?.email ?? data.subscriber?.email)?.toLowerCase()
  if (!buyerEmail) {
    // Sem email não há de quem conceder/revogar. 200 pra Hotmart não reenviar pra sempre.
    console.error(`[hotmart] ${event} sem email do comprador — ignorado`)
    return NextResponse.json({ ok: true, skipped: 'no buyer email' })
  }
  const offerCode = data.purchase?.offer?.code
  const productId = String(data.product?.id ?? '')
  const isSubscription = offerCode ? SUBSCRIPTION_OFFERS.has(offerCode) : false

  if (event === 'PURCHASE_APPROVED' || event === 'PURCHASE_COMPLETE') {
    const { buyer, purchase } = data
    if (!buyer || !purchase) {
      console.error(`[hotmart] ${event} sem buyer/purchase — ignorado`)
      return NextResponse.json({ ok: true, skipped: 'incomplete purchase payload' })
    }
    // Find or create auth user
    const { data: existingUsers } = await supabase
      .from('users')
      .select('id')
      .eq('email', buyerEmail)
      .limit(1)

    // Idioma da conta: vem do HOTMART_CHALLENGE_MAP (`ID:desafio:idioma`), como na Perfect Pay.
    // Sem idioma no mapa (entradas antigas `ID:desafio`) ou produto fora do mapa (assinatura) = 'es',
    // o comportamento de antes (Hotmart era só Latam). CL-CZ (14/10/2026) foi a 1ª oferta Hotmart fora do espanhol.
    const locale = getMappingForProduct(productId)?.locale ?? 'es'
    // Normaliza pra E.164 com o DDI do país (mesmo motivo da Perfect Pay: sem "+DDI"
    // o WhatsApp não sai). Sem país conhecido, segue só com os dígitos e loga.
    const rawPhone = buyer.checkout_phone ?? buyer.phone ?? undefined
    const { phone, hadCountry } = toE164(rawPhone, { countryIso: buyer.address?.country_iso, locale })
    if (rawPhone && !hadCountry) {
      console.warn(
        `[hotmart] telefone sem país definido (venda ${purchase.transaction}, country_iso=${buyer.address?.country_iso ?? 'vazio'}) — enviado sem +DDI: ${phone}`
      )
    }

    let userId: string
    if (existingUsers && existingUsers.length > 0) {
      userId = existingUsers[0].id
    } else {
      // Conta nasce JÁ ATIVA com um código de acesso (senha inicial), entregue
      // pela Voxuy (WhatsApp) + backup por recovery. Sem etapa de "invente a senha".
      const code = generateAccessCode()
      const { data: created, error: createError } = await supabase.auth.admin.createUser({
        email: buyerEmail,
        password: code,
        email_confirm: true,
        user_metadata: { name: buyer.name, locale },
      })
      if (createError || !created.user) {
        // Order bump: a compra principal e o bump são aprovados no mesmo instante e os dois
        // webhooks chegam juntos — o outro pode ter criado a conta entre a busca acima e este
        // createUser. Se a conta já existe, só concede (quem criou a conta já enviou o acesso).
        const { data: createdMeanwhile } = await supabase
          .from('users')
          .select('id')
          .eq('email', buyerEmail)
          .limit(1)
        if (!createdMeanwhile || createdMeanwhile.length === 0) {
          console.error('[hotmart] Failed to create user:', createError)
          return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
        }
        userId = createdMeanwhile[0].id
      } else {
        userId = created.user.id
        if (phone) await supabase.from('users').update({ phone }).eq('id', userId)

        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
        const link = buildAccessLink(appUrl, locale, buyerEmail, code)
        // Entrega dupla, best-effort: WhatsApp (Z-API ou Voxuy, pela env WHATSAPP_PROVIDER) + email (Resend, contingência
        // que não depende de telefone). Se um falhar, o outro cobre.
        await sendWhatsAppAccess({
          productCode: productId,
          transactionId: purchase.transaction,
          name: buyer.name,
          email: buyerEmail,
          phone,
          code,
          link,
          locale,
        })
        await sendAccessEmail({ email: buyerEmail, code, link, locale })
      }
    }

    if (isSubscription) {
      const planType =
        offerCode && (ANNUAL_OFFERS.has(offerCode) || TRIAL_ANNUAL_OFFERS.has(offerCode))
          ? 'annual'
          : 'monthly'
      const subCode = data.subscription?.subscriber?.code ?? purchase.transaction

      // Acesso vale até a PRÓXIMA COBRANÇA que a Hotmart informa (+ folga pras novas tentativas de cobrança).
      // Antes: sempre hoje + 365/30 dias — o teste grátis (aprovação de US$ 0, cobrança no dia 8) ganhava 1 ano,
      // e quem cancelava no teste (PURCHASE_CANCELED) ou não pagava no dia 8 (PURCHASE_DELAYED) ficava com ele.
      // Medido nos webhooks da oferta v4lltj3v em 14/10/2026: 30 cancelamentos no teste, 12 cobranças atrasadas.
      // Quem paga recebe novo PURCHASE_APPROVED (recurrence_number 2+) com a data seguinte.
      const DAY = 24 * 60 * 60 * 1000
      const GRACE_DAYS = 3
      const nextCharge = purchase.date_next_charge
      const newEnd = nextCharge
        ? nextCharge + GRACE_DAYS * DAY
        : Date.now() + (planType === 'annual' ? 365 : 30) * DAY
      // Nunca anda pra trás: o PURCHASE_COMPLETE da 1ª cobrança pode chegar depois da renovação.
      const { data: current } = await supabase
        .from('subscriptions')
        .select('current_period_end')
        .eq('stripe_sub_id', subCode)
        .maybeSingle()
      const currentEnd = current?.current_period_end ? new Date(current.current_period_end).getTime() : 0

      await supabase.from('subscriptions').upsert({
        user_id: userId,
        stripe_sub_id: subCode,
        status: 'active',
        plan_type: planType,
        current_period_end: new Date(Math.max(newEnd, currentEnd)).toISOString(),
      }, { onConflict: 'stripe_sub_id' })

      // Grant access to all non-free mock challenges (IDs from lib/mock-challenges.ts).
      // Quando migrar pra UUIDs reais, trocar por query à tabela challenges.
      const NON_FREE_CHALLENGE_IDS = ['2', '3', '4', '5']
      await supabase.from('user_challenges').upsert(
        NON_FREE_CHALLENGE_IDS.map((cid) => ({
          user_id: userId,
          challenge_id: cid,
          access_type: 'subscription' as const,
        })),
        { onConflict: 'user_id,challenge_id', ignoreDuplicates: true }
      )
    } else {
      // Lifetime purchase — map Hotmart product ID to challenge via env var
      const challengeId = getChallengeIdForProduct(productId)
      if (challengeId) {
        // Sem ignoreDuplicates: assinante que compra o avulso já tem a linha 'subscription'
        // deste desafio — ela precisa virar 'lifetime', senão a compra some quando a assinatura acabar.
        await supabase.from('user_challenges').upsert({
          user_id: userId,
          challenge_id: challengeId,
          access_type: 'lifetime',
        }, { onConflict: 'user_id,challenge_id' })
        await registrarCompra(supabase, { userId, produto: productId, venda: `hm:${purchase.transaction}` })
        // Indicação (19/10/2026): comprou pelo link de uma aluna → presente para as duas, sem ninguém pedir.
        if (challengeId === '1') await presentesDaIndicacao(purchase.origin?.src, userId, buyer.name)
      } else {
        // Produto fora do mapa (ex.: order bump novo): antes passava em silêncio, sem liberar nada.
        console.error(
          `[hotmart] Produto NÃO MAPEADO: ${productId} (venda ${purchase.transaction}, ${buyerEmail}). ` +
            'Adicionar ao HOTMART_CHALLENGE_MAP e reenviar o webhook.'
        )
      }
    }
  }

  if (event === 'SUBSCRIPTION_CANCELLATION' || event === 'PURCHASE_REFUNDED' || event === 'PURCHASE_CHARGEBACK') {
    // Look up the user by buyer email — only revoke their own access.
    const { data: existingUsers } = await supabase
      .from('users')
      .select('id')
      .eq('email', buyerEmail)
      .limit(1)

    if (!existingUsers || existingUsers.length === 0) {
      return NextResponse.json({ ok: true, skipped: 'user not found' })
    }
    const userId = existingUsers[0].id

    if (event === 'SUBSCRIPTION_CANCELLATION') {
      // Cancelar = desligar a renovação. A Hotmart dispara na hora do clique,
      // mas o período já foi pago: só marca 'canceled' e o getUserAccess
      // mantém o acesso até current_period_end. Nada é deletado aqui.
      // O payload de cancelamento não traz offer (isSubscription sai false): casa pelo código do assinante.
      const subCode = data.subscriber?.code ?? data.subscription?.subscriber?.code ?? data.purchase?.transaction
      if (subCode) {
        await supabase
          .from('subscriptions')
          .update({ status: 'canceled' })
          .eq('stripe_sub_id', subCode)
          .eq('user_id', userId)
      }
      return NextResponse.json({ ok: true })
    }

    // Reembolso/chargeback: dinheiro devolvido — acesso cai na hora.
    if (isSubscription) {
      const subCode = data.subscription?.subscriber?.code ?? data.purchase?.transaction
      await supabase
        .from('subscriptions')
        .update({ status: 'refunded' })
        .eq('stripe_sub_id', subCode)
        .eq('user_id', userId)

      await supabase
        .from('user_challenges')
        .delete()
        .eq('user_id', userId)
        .eq('access_type', 'subscription')
    } else {
      const challengeId = getChallengeIdForProduct(productId)
      const transacao = data.purchase?.transaction
      // Estorno de UMA venda não tira o acesso se ela tem outra compra válida do mesmo produto (lib/compras.ts).
      const revoga = !transacao || (await deveRevogar(supabase, { userId, produto: productId, venda: `hm:${transacao}` }))
      if (challengeId && revoga) {
        await supabase
          .from('user_challenges')
          .delete()
          .eq('user_id', userId)
          .eq('challenge_id', challengeId)
          .eq('access_type', 'lifetime')
      }
    }
  }

  return NextResponse.json({ ok: true })
}

// HOTMART_CHALLENGE_MAP="ID:challengeId[:locale],..." — locale opcional (default es), igual ao
// PERFECTPAY_CHALLENGE_MAP. Ex.: "4784921:2,<ID_HOTMART_CZ>:1:cs". Idioma que o app não tem (ex.: mapa
// trocado antes do deploy do idioma) cai em 'es' com erro no log — senão o link de acesso daria página
// não encontrada.
function getMappingForProduct(productId: string): { challengeId: string; locale: string } | null {
  const map = process.env.HOTMART_CHALLENGE_MAP ?? ''
  for (const entry of map.split(',')) {
    const [pid, cid, loc] = entry.split(':').map((x) => x?.trim())
    if (!pid || pid !== productId) continue
    let locale = loc || 'es'
    if (!hasLocale(routing.locales, locale)) {
      console.error(`[hotmart] HOTMART_CHALLENGE_MAP: idioma '${locale}' do produto ${productId} não existe no app — usando 'es'`)
      locale = 'es'
    }
    return { challengeId: cid ?? '', locale }
  }
  return null
}

function getChallengeIdForProduct(productId: string): string | null {
  return getMappingForProduct(productId)?.challengeId || null
}

// Amiga comprou o desafio com o link de uma aluna (src=ind-<id da aluna>, lib/indicacao-link.ts): a aluna ganha
// 1 mês do Pase, a amiga ganha a dieta personalizada extra, e as duas ficam sabendo pelo WhatsApp. Falha aqui
// nunca derruba a compra (o acesso já foi liberado acima).
async function presentesDaIndicacao(src: string | undefined, amigaId: string, nomeAmiga: string) {
  const alunaId = indicadoraDoSrc(src)
  if (!alunaId || alunaId === amigaId) return
  try {
    const r = await darPaseDeIndicacao(alunaId, amigaId)
    if (r !== 'ok') return
    await darCardapioBonus(amigaId, 'indicacao')
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data: aluna } = await db.from('users').select('phone, name').eq('id', alunaId).single()
    const { data: amiga } = await db.from('users').select('phone').eq('id', amigaId).single()
    const primeiro = (n?: string | null) => (n ?? '').trim().split(/\s+/)[0] ?? ''
    if (aluna?.phone) {
      await enfileirar({
        phone: aluna.phone.replace(/\D/g, ''),
        kind: 'indicacao-aviso',
        body: `¡${primeiro(nomeAmiga) || 'Tu amiga'} compró con tu link! 💛 Gracias por recomendarnos.\n\nTe liberamos *1 mes del Pase Completo*: ya tienes todos los desafíos desbloqueados en la pestaña Desafíos.`,
        sendAfter: new Date(Date.now() + 60_000),
      })
    }
    if (amiga?.phone) {
      await enfileirar({
        phone: amiga.phone.replace(/\D/g, ''),
        kind: 'indicacao-aviso',
        body: `Llegaste por invitación de ${primeiro(aluna?.name) || 'una amiga'} 💛 Como regalo, te liberamos una *dieta personalizada* extra en la app: pestaña Menú → crea tu menú.`,
        sendAfter: new Date(Date.now() + 25 * 60_000), // depois do acesso (que sai ~15 min após a compra)
      })
    }
  } catch (err) {
    console.error('[hotmart] presentes da indicação falharam:', err)
  }
}
