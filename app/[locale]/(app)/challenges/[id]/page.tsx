import { mockChallenges, type MockChallenge } from '@/lib/mock-challenges'
import { getMockDays } from '@/lib/mock-challenge-days'
import { notFound } from 'next/navigation'
import { getProgressForChallenge } from '@/lib/progress-server'
import { getUserAccess, canAccessChallenge } from '@/lib/user-access-server'
import { ChallengeDetailClient } from './ChallengeDetailClient'

export default async function ChallengeDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  const base = mockChallenges.find((c) => c.id === id)
  if (!base) notFound()

  const [access, progress] = await Promise.all([
    getUserAccess(),
    getProgressForChallenge(id),
  ])

  const completedDayNumbers = new Set(progress.map((p) => p.day_number))
  const rawDays = getMockDays(id)
  const days = rawDays.map((d) => ({
    ...d,
    completed: completedDayNumbers.has(d.day_number),
  }))

  const unlocked = canAccessChallenge(id, access)
  const completedCount = progress.length
  let status: MockChallenge['status']
  if (!unlocked) status = 'locked'
  else if (completedCount >= base.days_count) status = 'completed'
  else if (completedCount > 0) status = 'active'
  else status = base.is_free ? 'free' : 'active'

  const challenge: MockChallenge = {
    ...base,
    status,
    current_day: completedCount > 0 ? completedCount : undefined,
  }

  return <ChallengeDetailClient challenge={challenge} days={days} locale={locale} />
}
