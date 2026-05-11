import { mockChallenges } from '@/lib/mock-challenges'
import { getMockDays } from '@/lib/mock-challenge-days'
import { notFound, redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { VideoPlayer } from './VideoPlayer'
import { canAccessChallenge, getUserAccess } from '@/lib/user-access-server'

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ locale: string; id: string; day: string }>
}) {
  const { locale, id, day } = await params
  const challenge = mockChallenges.find((c) => c.id === id)
  if (!challenge) notFound()

  const access = await getUserAccess()
  if (!canAccessChallenge(id, access)) {
    redirect(`/${locale}/challenges/${id}`)
  }

  const tDays = await getTranslations('challengeDays')
  const dayTitles = (tDays.raw(id) as string[] | undefined) ?? []

  const days = getMockDays(id, dayTitles)
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
