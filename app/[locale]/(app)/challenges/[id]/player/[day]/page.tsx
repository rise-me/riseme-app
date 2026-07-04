import { mockChallenges } from '@/lib/mock-challenges'
import { getMockDays } from '@/lib/mock-challenge-days'
import { notFound, redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { VideoPlayer } from './VideoPlayer'
import { canAccessChallenge, getUserAccess } from '@/lib/user-access-server'
import { getProgressForChallenge } from '@/lib/progress-server'

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

  const days = getMockDays(id, dayTitles, locale)
  const dayNumber = parseInt(day)
  const currentDay = days.find((d) => d.day_number === dayNumber)
  if (!currentDay) notFound()

  // Trava sequencial no servidor: URL direta /player/28 não pula a fila.
  // Um dia só abre se for o 1 ou se o anterior estiver concluído.
  if (dayNumber > 1) {
    const progress = await getProgressForChallenge(id)
    const completed = new Set(progress.map((p) => p.day_number))
    if (!completed.has(dayNumber - 1)) {
      redirect(`/${locale}/challenges/${id}`)
    }
  }

  return (
    <VideoPlayer
      challenge={challenge}
      days={days}
      currentDayNumber={dayNumber}
      locale={locale}
    />
  )
}
