import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const HOTMART_TOKEN = process.env.HOTMART_WEBHOOK_TOKEN

// Offer codes (parâmetro ?off=) — a Hotmart envia em data.purchase.offer.code
const OFFER_MONTHLY = process.env.HOTMART_OFFER_MONTHLY
const OFFER_ANNUAL = process.env.HOTMART_OFFER_ANNUAL
const OFFER_TRIAL_ANNUAL = process.env.HOTMART_OFFER_TRIAL_ANNUAL
const SUBSCRIPTION_OFFERS = new Set(
  [OFFER_MONTHLY, OFFER_ANNUAL, OFFER_TRIAL_ANNUAL].filter(Boolean)
)

type HotmartEvent =
  | 'PURCHASE_APPROVED'
  | 'PURCHASE_COMPLETE'
  | 'SUBSCRIPTION_CANCELLATION'
  | 'PURCHASE_REFUNDED'
  | string

interface HotmartPayload {
  event: HotmartEvent
  data: {
    product: { id: number; ucode: string; name: string }
    buyer: { email: string; name: string }
    purchase: {
      transaction: string
      status: string
      offer?: { code: string }
      recurrence_number?: number
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
  // Verify hottok
  const token = request.nextUrl.searchParams.get('hottok')
  if (HOTMART_TOKEN && token !== HOTMART_TOKEN) {
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

  if (!['PURCHASE_APPROVED', 'PURCHASE_COMPLETE', 'SUBSCRIPTION_CANCELLATION', 'PURCHASE_REFUNDED'].includes(event)) {
    return NextResponse.json({ ok: true, skipped: true })
  }

  const buyerEmail = data.buyer.email.toLowerCase()
  const offerCode = data.purchase.offer?.code
  const productId = String(data.product.id)
  const isSubscription = offerCode ? SUBSCRIPTION_OFFERS.has(offerCode) : false

  if (event === 'PURCHASE_APPROVED' || event === 'PURCHASE_COMPLETE') {
    // Find or create auth user
    const { data: existingUsers } = await supabase
      .from('users')
      .select('id')
      .eq('email', buyerEmail)
      .limit(1)

    let userId: string
    if (existingUsers && existingUsers.length > 0) {
      userId = existingUsers[0].id
    } else {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
      const { data: invited, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(buyerEmail, {
        data: { name: data.buyer.name },
        redirectTo: `${appUrl}/set-password`,
      })
      if (inviteError || !invited.user) {
        console.error('[hotmart] Failed to invite user:', inviteError)
        return NextResponse.json({ error: 'Failed to invite user' }, { status: 500 })
      }
      userId = invited.user.id
    }

    if (isSubscription) {
      const planType = (offerCode === OFFER_ANNUAL || offerCode === OFFER_TRIAL_ANNUAL) ? 'annual' : 'monthly'
      const subCode = data.subscription?.subscriber?.code ?? data.purchase.transaction

      await supabase.from('subscriptions').upsert({
        user_id: userId,
        stripe_sub_id: subCode,
        status: 'active',
        plan_type: planType,
        current_period_end: new Date(Date.now() + (planType === 'annual' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString(),
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
        await supabase.from('user_challenges').upsert({
          user_id: userId,
          challenge_id: challengeId,
          access_type: 'lifetime',
        }, { onConflict: 'user_id,challenge_id', ignoreDuplicates: true })
      }
    }
  }

  if (event === 'SUBSCRIPTION_CANCELLATION' || event === 'PURCHASE_REFUNDED') {
    const subCode = data.subscription?.subscriber?.code ?? data.purchase.transaction
    await supabase
      .from('subscriptions')
      .update({ status: 'canceled' })
      .eq('stripe_sub_id', subCode)
  }

  return NextResponse.json({ ok: true })
}

function getChallengeIdForProduct(productId: string): string | null {
  const map = process.env.HOTMART_CHALLENGE_MAP ?? ''
  for (const entry of map.split(',')) {
    const [pid, cid] = entry.split(':')
    if (pid?.trim() === productId) return cid?.trim() ?? null
  }
  return null
}
