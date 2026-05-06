'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Play, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MockWorkout, MockWorkoutLesson } from '@/lib/mock-workouts'

interface Props {
  workout: MockWorkout
  lessons: MockWorkoutLesson[]
  locale: string
}

export function WorkoutDetailClient({ workout, lessons, locale }: Props) {
  const router = useRouter()
  const t = useTranslations('workoutsPage')
  const tWorkouts = useTranslations('workoutData')
  const tChallenges = useTranslations('challenges')
  const tLessons = useTranslations('workoutLessons')

  const lessonTitles = (tLessons.raw(workout.id) as string[]) ?? []

  const completedCount = lessons.filter((l) => l.completed).length

  function handleLessonClick(lesson: MockWorkoutLesson) {
    router.push(`/${locale}/workouts/${workout.id}/player/${lesson.lesson_number}`)
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="relative bg-foreground text-background pt-14 pb-6 px-4">
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 w-9 h-9 rounded-full bg-background/10 flex items-center justify-center"
        >
          <ArrowLeft size={18} className="text-background" />
        </button>

        <div className="text-6xl mb-4">{workout.emoji}</div>
        <h1 className="text-2xl font-black leading-tight mb-1">{tWorkouts(`${workout.id}.title`)}</h1>
        <p className="text-background/60 text-sm">
          {t('lessonsCount', { count: workout.lessons_count })} · {tChallenges(workout.level)}
        </p>
        <p className="text-background/50 text-sm mt-1">{tWorkouts(`${workout.id}.description`)}</p>

        {completedCount > 0 && (
          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between text-xs text-background/60">
              <span>{tChallenges('inProgress')}</span>
              <span>{t('ofTotal', { done: completedCount, total: workout.lessons_count })}</span>
            </div>
            <div className="h-1.5 bg-background/20 rounded-full">
              <div
                className="h-full bg-background rounded-full transition-all"
                style={{ width: `${(completedCount / workout.lessons_count) * 100}%` }}
              />
            </div>
          </div>
        )}

        <button
          onClick={() => handleLessonClick(lessons[completedCount] ?? lessons[0])}
          className="mt-5 w-full py-3.5 rounded-2xl text-sm font-bold tracking-wide bg-background text-foreground"
        >
          {completedCount > 0
            ? t('continueLesson', { number: completedCount + 1 })
            : t('startWorkout')}
        </button>
      </div>

      <div className="px-4 py-3">
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">
          {lessons.length} {t('lessonsLabel')}
        </p>
      </div>

      <div className="flex-1 px-4 pb-6 space-y-2">
        {lessons.map((lesson) => {
          const completed = lesson.completed ?? false
          const title = lessonTitles[lesson.lesson_number - 1] ?? `Lesson ${lesson.lesson_number}`

          return (
            <button
              key={lesson.lesson_number}
              onClick={() => handleLessonClick(lesson)}
              className="w-full flex items-center gap-3 bg-card border border-border rounded-2xl p-3.5 text-left transition-all active:scale-[0.98]"
            >
              <div className={cn(
                'w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0',
                completed ? 'bg-foreground' : 'bg-secondary'
              )}>
                {completed
                  ? <CheckCircle2 size={22} className="text-background" />
                  : <Play size={18} className="text-foreground" />}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm leading-tight truncate">
                  {title}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Clock size={11} className="text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{lesson.duration_minutes} min</span>
                </div>
              </div>

              <span className="text-xs text-muted-foreground font-semibold flex-shrink-0">
                {t('lessonNumber', { number: lesson.lesson_number })}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
