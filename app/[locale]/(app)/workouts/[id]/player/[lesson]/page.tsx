import { getMockWorkoutById, getMockWorkoutLessons } from '@/lib/mock-workouts'
import { getUserAccess } from '@/lib/user-access-server'
import { notFound, redirect } from 'next/navigation'
import { WorkoutPlayer } from './WorkoutPlayer'

// Seção desativada em 2026-07-03 — remover o redirect pra reativar.
const WORKOUTS_DISABLED = true

export default async function WorkoutPlayerPage({
  params,
}: {
  params: Promise<{ locale: string; id: string; lesson: string }>
}) {
  const { locale, id, lesson } = await params
  if (WORKOUTS_DISABLED) redirect(`/${locale}/challenges`)
  const workout = getMockWorkoutById(id)
  if (!workout) notFound()

  const lessons = getMockWorkoutLessons(id)
  const lessonNumber = parseInt(lesson, 10)
  if (!Number.isInteger(lessonNumber) || lessonNumber < 1 || lessonNumber > lessons.length) {
    notFound()
  }

  const access = await getUserAccess()
  const hideUpsell = access.hasActiveSubscription || access.ownedChallengeIds.size > 0

  return (
    <WorkoutPlayer
      workout={workout}
      lessons={lessons}
      currentLessonNumber={lessonNumber}
      locale={locale}
      hideUpsell={hideUpsell}
    />
  )
}
