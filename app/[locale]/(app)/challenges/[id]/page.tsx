import { mockChallenges } from '@/lib/mock-challenges'
import { getMockDays } from '@/lib/mock-challenge-days'
import { notFound } from 'next/navigation'
import { ChallengeDetailClient } from './ChallengeDetailClient'

export default async function ChallengeDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  const challenge = mockChallenges.find((c) => c.id === id)

  if (!challenge) notFound()

  const days = getMockDays(id)

  return <ChallengeDetailClient challenge={challenge} days={days} locale={locale} />
}
