'use server'

import { requireAdmin, createServiceClient } from '@/lib/admin-server'

const KNOWN_LOCALES = ['es', 'tr', 'pt-BR', 'en'] as const
export type SupportLocale = (typeof KNOWN_LOCALES)[number]

export interface UserLookup {
  found: boolean
  id?: string
  email?: string
  name?: string | null
  locale?: string | null
  createdAt?: string | null
  invitedAt?: string | null
  confirmedAt?: string | null
  lastSignInAt?: string | null
  challenges?: Array<{ challenge_id: string; access_type: string | null }>
  activeSubscription?: { plan_type: string | null; current_period_end: string | null } | null
}

export async function searchUser(rawEmail: string): Promise<UserLookup | { error: string }> {
  await requireAdmin()
  const email = rawEmail.trim().toLowerCase()
  if (!email || !email.includes('@')) return { error: 'Email inválido' }

  const supabase = createServiceClient()
  const { data: rows, error } = await supabase
    .from('users')
    .select('id, email, name')
    .eq('email', email)
    .limit(1)
  if (error) return { error: error.message }
  if (!rows || rows.length === 0) return { found: false }

  const row = rows[0] as { id: string; email: string; name: string | null }

  const [{ data: authData }, { data: challenges }, { data: subs }] = await Promise.all([
    supabase.auth.admin.getUserById(row.id),
    supabase.from('user_challenges').select('challenge_id, access_type').eq('user_id', row.id),
    supabase
      .from('subscriptions')
      .select('plan_type, current_period_end, status')
      .eq('user_id', row.id)
      .eq('status', 'active')
      .limit(1),
  ])

  const authUser = authData?.user
  const subRows = (subs ?? []) as Array<{ plan_type: string | null; current_period_end: string | null }>

  return {
    found: true,
    id: row.id,
    email: row.email,
    name: row.name ?? (authUser?.user_metadata?.name as string | undefined) ?? null,
    locale: (authUser?.user_metadata?.locale as string | undefined) ?? null,
    createdAt: authUser?.created_at ?? null,
    invitedAt: (authUser as { invited_at?: string } | undefined)?.invited_at ?? null,
    confirmedAt: authUser?.email_confirmed_at ?? null,
    lastSignInAt: authUser?.last_sign_in_at ?? null,
    challenges: ((challenges ?? []) as Array<{ challenge_id: string; access_type: string | null }>).map(
      (c) => ({ challenge_id: String(c.challenge_id), access_type: c.access_type })
    ),
    activeSubscription: subRows[0] ?? null,
  }
}

// Cobre os dois casos do suporte: convidada que nunca definiu senha e cliente
// que esqueceu — o link de recovery serve pros dois (mesmo fluxo do /forgot-password).
export async function sendPasswordLink(rawEmail: string, locale: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin()
  const email = rawEmail.trim().toLowerCase()
  const safeLocale = (KNOWN_LOCALES as readonly string[]).includes(locale) ? locale : 'es'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://riseme.app'

  const supabase = createServiceClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/${safeLocale}/reset-password`,
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function grantChallenge(userId: string, challengeId: string): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin()
  const supabase = createServiceClient()
  const { error } = await supabase.from('user_challenges').upsert(
    { user_id: userId, challenge_id: challengeId, access_type: 'lifetime' },
    { onConflict: 'user_id,challenge_id', ignoreDuplicates: true }
  )
  if (error) return { ok: false, error: error.message }
  console.log(`[admin] ${admin.email} liberou desafio ${challengeId} pra user ${userId}`)
  return { ok: true }
}

export async function revokeChallenge(userId: string, challengeId: string): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin()
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('user_challenges')
    .delete()
    .eq('user_id', userId)
    .eq('challenge_id', challengeId)
  if (error) return { ok: false, error: error.message }
  console.log(`[admin] ${admin.email} removeu desafio ${challengeId} de user ${userId}`)
  return { ok: true }
}

export async function createAccount(params: {
  email: string
  name: string
  locale: string
  challengeId?: string
}): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin()
  const email = params.email.trim().toLowerCase()
  if (!email.includes('@')) return { ok: false, error: 'Email inválido' }
  const safeLocale = (KNOWN_LOCALES as readonly string[]).includes(params.locale) ? params.locale : 'es'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://riseme.app'

  const supabase = createServiceClient()
  const { data: invited, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { name: params.name.trim() || undefined, locale: safeLocale },
    redirectTo: `${appUrl}/${safeLocale}/set-password`,
  })
  if (inviteError || !invited?.user) {
    return { ok: false, error: inviteError?.message ?? 'Falha ao convidar' }
  }

  if (params.challengeId) {
    const { error: grantError } = await supabase.from('user_challenges').upsert(
      { user_id: invited.user.id, challenge_id: params.challengeId, access_type: 'lifetime' },
      { onConflict: 'user_id,challenge_id', ignoreDuplicates: true }
    )
    if (grantError) return { ok: false, error: `Conta criada, mas falhou ao liberar desafio: ${grantError.message}` }
  }

  console.log(`[admin] ${admin.email} criou conta ${email} (locale ${safeLocale}, desafio ${params.challengeId ?? '—'})`)
  return { ok: true }
}
