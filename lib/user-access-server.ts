import { createClient } from '@/lib/supabase/server'
import { mockChallenges } from '@/lib/mock-challenges'

export interface UserAccess {
  userId: string | null
  hasActiveSubscription: boolean
  ownedChallengeIds: Set<string>
}

export async function getUserAccess(): Promise<UserAccess> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { userId: null, hasActiveSubscription: false, ownedChallengeIds: new Set() }
  }

  const [{ data: userChallenges }, { data: subs }] = await Promise.all([
    supabase.from('user_challenges').select('challenge_id').eq('user_id', user.id),
    supabase
      .from('subscriptions')
      .select('status, current_period_end')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1),
  ])

  const ownedRows = (userChallenges ?? []) as Array<{ challenge_id: string }>
  const subRows = (subs ?? []) as Array<{ current_period_end: string }>

  const ownedChallengeIds = new Set<string>(ownedRows.map((r) => String(r.challenge_id)))
  const hasActiveSubscription = subRows.some(
    (s) => new Date(s.current_period_end).getTime() > Date.now()
  )

  return { userId: user.id, hasActiveSubscription, ownedChallengeIds }
}

export function canAccessChallenge(
  challengeId: string,
  access: UserAccess
): boolean {
  const challenge = mockChallenges.find((c) => c.id === challengeId)
  if (!challenge) return false
  if (challenge.is_free) return true
  if (access.hasActiveSubscription) return true
  return access.ownedChallengeIds.has(challengeId)
}
