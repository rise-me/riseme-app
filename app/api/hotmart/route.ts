import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Hotmart sends a `hottok` query param for verification
const HOTMART_TOKEN = process.env.HOTMART_WEBHOOK_TOKEN

// Hotmart product IDs → mapped to subscription type or challenge slug
const SUBSCRIPTION_PRODUCT_IDS = new Set([
  process.env.HOTMART_SUBSCRIPTION_MONTHLY_ID,
  process.env.HOTMART_SUBSCRIPTION_ANNUAL_ID,
].filter(Boolean))

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
  // Verify token
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

  // Only handle purchase/subscription events
  if (!['PURCHASE_APPROVED', 'PURCHASE_COMPLETE', 'SUBSCRIPTION_CANCELLATION', 'PURCHASE_REFUNDED'].includes(event)) {
    return NextResponse.json({ ok: true, skipped: true })
  }

  const buyerEmail = data.buyer.email.toLowerCase()
  const productId = String(data.product.id)
  const isSubscription = SUBSCRIPTION_PRODUCT_IDS.has(productId)

  if (event === 'PURCHASE_APPROVED' || event === 'PURCHASE_COMPLETE') {
    // Find or create the auth user
    const { data: existingUsers } = await supabase
      .from('users')
      .select('id')
      .eq('email', buyerEmail)
      .limit(1)

    let userId: string

    if (existingUsers && existingUsers.length > 0) {
      userId = existingUsers[0].id
    } else {
      // Create a new auth user — they'll set password via email link
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: buyerEmail,
        email_confirm: true,
        user_metadata: { name: data.buyer.name },
      })
      if (createError || !newUser.user) {
        console.error('[hotmart] Failed to create user:', createError)
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
      }
      userId = newUser.user.id
    }

    if (isSubscription) {
      // Determine plan type
      const planName = data.subscription?.plan?.name?.toLowerCase() ?? ''
      const planType = planName.includes('anual') || planName.includes('annual') ? 'annual' : 'monthly'
      const subCode = data.subscription?.subscriber?.code ?? data.purchase.transaction

      // Upsert subscription record (using transaction/sub code in stripe_sub_id field)
      await supabase.from('subscriptions').upsert({
        user_id: userId,
        stripe_sub_id: subCode,
        status: 'active',
        plan_type: planType,
        current_period_end: new Date(Date.now() + (planType === 'annual' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString(),
      }, { onConflict: 'stripe_sub_id' })

      // Grant access to all non-free challenges
      const { data: challenges } = await supabase
        .from('challenges')
        .select('id')
        .eq('is_free', false)

      if (challenges) {
        await supabase.from('user_challenges').upsert(
          challenges.map((c) => ({
            user_id: userId,
            challenge_id: c.id,
            access_type: 'subscription' as const,
          })),
          { onConflict: 'user_id,challenge_id', ignoreDuplicates: true }
        )
      }
    } else {
      // Lifetime purchase — map Hotmart product ID to challenge via env var
      // Format: HOTMART_CHALLENGE_MAP=hotmartProductId:challengeSupabaseId,...
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
  // HOTMART_CHALLENGE_MAP="12345:uuid-here,67890:uuid-there"
  const map = process.env.HOTMART_CHALLENGE_MAP ?? ''
  for (const entry of map.split(',')) {
    const [pid, cid] = entry.split(':')
    if (pid?.trim() === productId) return cid?.trim() ?? null
  }
  return null
}
