import { getMockWorkoutById, getMockWorkoutLessons } from '@/lib/mock-workouts'
import { notFound } from 'next/navigation'
import { WorkoutDetailClient } from './WorkoutDetailClient'

export default async function WorkoutDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  const workout = getMockWorkoutById(id)
  if (!workout) notFound()

  const lessons = getMockWorkoutLessons(id)

  return <WorkoutDetailClient workout={workout} lessons={lessons} locale={locale} />
}
