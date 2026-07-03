import { getMockWorkoutById, getMockWorkoutLessons } from '@/lib/mock-workouts'
import { notFound, redirect } from 'next/navigation'
import { WorkoutDetailClient } from './WorkoutDetailClient'

// Seção desativada em 2026-07-03 — remover o redirect pra reativar.
const WORKOUTS_DISABLED = true

export default async function WorkoutDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  if (WORKOUTS_DISABLED) redirect(`/${locale}/challenges`)
  const workout = getMockWorkoutById(id)
  if (!workout) notFound()

  const lessons = getMockWorkoutLessons(id)

  return <WorkoutDetailClient workout={workout} lessons={lessons} locale={locale} />
}
