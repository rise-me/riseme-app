import { mockChallenges, type MockChallenge } from '@/lib/mock-challenges'
import { getProgressSummary } from '@/lib/progress-server'
import { getUserAccess, canAccessChallenge } from '@/lib/user-access-server'
import { ChallengesList } from './ChallengesList'

export default async function ChallengesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const [access, { progressByChallenge, activeChallengeId }] = await Promise.all([
    getUserAccess(),
    getProgressSummary(),
  ])

  const challenges: MockChallenge[] = mockChallenges.map((c) => {
    const unlocked = canAccessChallenge(c.id, access)
    const completed = progressByChallenge.get(c.id) ?? 0

    let status: MockChallenge['status']
    if (!unlocked) status = 'locked'
    else if (completed >= c.days_count) status = 'completed'
    else if (c.id === activeChallengeId || completed > 0) status = 'active'
    else if (c.is_free) status = 'free'
    else status = 'active'

    return {
      ...c,
      status,
      current_day: completed > 0 ? completed : undefined,
    }
  })

  return <ChallengesList challenges={challenges} locale={locale} />
}
