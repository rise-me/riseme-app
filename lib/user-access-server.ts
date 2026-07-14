import { createClient } from '@/lib/supabase/server'
import { mockChallenges } from '@/lib/mock-challenges'
import type { MockBonus } from '@/lib/mock-bonuses'

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
    supabase.from('user_challenges').select('challenge_id, access_type').eq('user_id', user.id),
    supabase
      .from('subscriptions')
      .select('status, current_period_end')
      .eq('user_id', user.id)
      .in('status', ['active', 'canceled']),
  ])

  const ownedRows = (userChallenges ?? []) as Array<{ challenge_id: string; access_type: string | null }>
  const subRows = (subs ?? []) as Array<{ current_period_end: string }>

  // Cancelar assinatura = desligar a renovação: o acesso vale até o fim do
  // período já pago. Só reembolso/chargeback (status 'refunded') corta antes.
  const hasActiveSubscription = subRows.some(
    (s) => new Date(s.current_period_end).getTime() > Date.now()
  )

  // Linhas 'subscription' em user_challenges só valem enquanto houver período
  // pago (cobertas pelo hasActiveSubscription); avulsas contam só as lifetime.
  const ownedChallengeIds = new Set<string>(
    ownedRows.filter((r) => r.access_type === 'lifetime').map((r) => String(r.challenge_id))
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

// Bônus liberados pra quem comprou qualquer coisa: assinante OU dono de qualquer
// desafio vitalício. (Mesma lógica do hideUpsell no player de workout.)
export function canAccessBonuses(access: UserAccess): boolean {
  return access.hasActiveSubscription || access.ownedChallengeIds.size > 0
}

// Acesso a UM material da aba Extras. Produto de upsell ('purchase') exige compra
// daquele id específico — assinatura NÃO libera, é venda avulsa à parte.
export function canAccessBonus(bonus: MockBonus, access: UserAccess): boolean {
  if (bonus.access === 'purchase') return access.ownedChallengeIds.has(bonus.id)
  return canAccessBonuses(access)
}
