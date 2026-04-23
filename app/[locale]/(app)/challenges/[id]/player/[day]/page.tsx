import { mockChallenges } from '@/lib/mock-challenges'
import { getMockDays } from '@/lib/mock-challenge-days'
import { notFound } from 'next/navigation'
import { VideoPlayer } from './VideoPlayer'

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ locale: string; id: string; day: string }>
}) {
  const { locale, id, day } = await params
  const challenge = mockChallenges.find((c) => c.id === id)
  if (!challenge) notFound()

  const days = getMockDays(id)
  const dayNumber = parseInt(day)
  const currentDay = days.find((d) => d.day_number === dayNumber)
  if (!currentDay) notFound()

  return (
    <VideoPlayer
      challenge={challenge}
      days={days}
      currentDayNumber={dayNumber}
      locale={locale}
    />
  )
}
