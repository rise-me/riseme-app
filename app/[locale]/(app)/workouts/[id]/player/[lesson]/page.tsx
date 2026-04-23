import { getMockWorkoutById, getMockWorkoutLessons } from '@/lib/mock-workouts'
import { notFound } from 'next/navigation'
import { WorkoutPlayer } from './WorkoutPlayer'

export default async function WorkoutPlayerPage({
  params,
}: {
  params: Promise<{ locale: string; id: string; lesson: string }>
}) {
  const { locale, id, lesson } = await params
  const workout = getMockWorkoutById(id)
  if (!workout) notFound()

  const lessons = getMockWorkoutLessons(id)
  const lessonNumber = parseInt(lesson, 10)

  return (
    <WorkoutPlayer
      workout={workout}
      lessons={lessons}
      currentLessonNumber={lessonNumber}
      locale={locale}
    />
  )
}
