'use client'

import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { Clock, ChevronRight, Play } from 'lucide-react'
import Link from 'next/link'
import { mockWorkouts } from '@/lib/mock-workouts'

export default function WorkoutsPage() {
  const t = useTranslations('workoutsPage')
  const tWorkouts = useTranslations('workoutData')
  const tChallenges = useTranslations('challenges')
  const params = useParams()
  const locale = params.locale as string

  return (
    <div className="px-4 pt-12 pb-6 space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>

      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">
        {t('free')}
      </p>

      <div className="space-y-2.5">
        {mockWorkouts.map((workout) => (
          <Link
            key={workout.id}
            href={`/${locale}/workouts/${workout.id}`}
            className="w-full flex items-center gap-4 bg-card border border-border rounded-2xl p-4 text-left transition-all active:scale-[0.98] block"
          >
            <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center text-2xl flex-shrink-0">
              {workout.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-muted-foreground font-medium mb-0.5">{tChallenges(workout.level)}</p>
              <p className="font-bold text-sm leading-tight">{tWorkouts(`${workout.id}.title`)}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Clock size={11} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{t('lessonsCount', { count: workout.lessons_count })}</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-full bg-foreground flex items-center justify-center flex-shrink-0">
              <Play size={14} className="text-background ml-0.5" />
            </div>
          </Link>
        ))}
      </div>

      <div className="pt-2">
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-3">
          {t('wantMore')}
        </p>
        <Link href={`/${locale}/challenges`}>
          <div className="bg-foreground text-background rounded-2xl p-4 flex items-center gap-3">
            <div className="text-2xl">🏆</div>
            <div className="flex-1">
              <p className="font-bold text-sm">{t('unlockChallenges')}</p>
              <p className="text-xs text-background/60 mt-0.5">{t('guidedDays')}</p>
            </div>
            <ChevronRight size={16} className="text-background/60" />
          </div>
        </Link>
      </div>
    </div>
  )
}
