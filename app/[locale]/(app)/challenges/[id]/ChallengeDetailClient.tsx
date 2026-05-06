'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ArrowLeft, Heart, CheckCircle2, Lock, Play, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MockChallenge } from '@/lib/mock-challenges'
import type { MockDay, LevelKey } from '@/lib/mock-challenge-days'
import { PaywallModal } from '@/components/subscription/PaywallModal'
import { Dialog, DialogContent } from '@/components/ui/dialog'

type LevelFilter = 'all' | LevelKey
const LEVELS: LevelFilter[] = ['all', 'beginner', 'intermediate', 'advanced']

interface Props {
  challenge: MockChallenge
  days: MockDay[]
  locale: string
}

export function ChallengeDetailClient({ challenge, days, locale }: Props) {
  const router = useRouter()
  const t = useTranslations('challenges')
  const tData = useTranslations('challengeData')
  const [activeLevel, setActiveLevel] = useState<LevelFilter>('all')
  const [paywallOpen, setPaywallOpen] = useState(false)
  const [sequentialOpen, setSequentialOpen] = useState(false)
  const [favorited, setFavorited] = useState(false)

  const challengeTitle = tData(`${challenge.id}.title`)
  const challengeCategory = tData(`${challenge.id}.category`)

  const isLocked = challenge.status === 'locked'
  const completedCount = days.filter((d) => d.completed).length

  const filteredDays =
    activeLevel === 'all' ? days : days.filter((d) => d.level === activeLevel)

  function isDayUnlocked(day: MockDay): boolean {
    if (isLocked) return false
    return day.day_number === 1 || days.find(d => d.day_number === day.day_number - 1)?.completed === true
  }

  function handleDayClick(day: MockDay) {
    if (isLocked) {
      setPaywallOpen(true)
      return
    }
    if (!isDayUnlocked(day)) {
      setSequentialOpen(true)
      return
    }
    router.push(`/${locale}/challenges/${challenge.id}/player/${day.day_number}`)
  }

  return (
    <>
      <div className="flex flex-col min-h-screen">
        <div className="relative bg-foreground text-background pt-14 pb-6 px-4">
          <button
            onClick={() => router.back()}
            className="absolute top-4 left-4 w-9 h-9 rounded-full bg-background/10 flex items-center justify-center"
          >
            <ArrowLeft size={18} className="text-background" />
          </button>

          <button
            onClick={() => setFavorited(f => !f)}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-background/10 flex items-center justify-center"
          >
            <Heart
              size={18}
              className={cn(favorited ? 'fill-red-400 text-red-400' : 'text-background')}
            />
          </button>

          <div className="text-6xl mb-4">{challenge.thumbnail_emoji}</div>
          <h1 className="text-2xl font-black leading-tight mb-1">{challengeTitle}</h1>
          <p className="text-background/60 text-sm">
            {challenge.days_count} {t('workouts')} · {challengeCategory}
          </p>

          {challenge.status === 'active' && (
            <div className="mt-4 space-y-1.5">
              <div className="flex justify-between text-xs text-background/60">
                <span>{t('inProgress')}</span>
                <span>{completedCount} / {challenge.days_count}</span>
              </div>
              <div className="h-1.5 bg-background/20 rounded-full">
                <div
                  className="h-full bg-background rounded-full transition-all"
                  style={{ width: `${(completedCount / challenge.days_count) * 100}%` }}
                />
              </div>
            </div>
          )}

          <button
            onClick={() => isLocked ? setPaywallOpen(true) : handleDayClick(days[completedCount] ?? days[0])}
            className={cn(
              'mt-5 w-full py-3.5 rounded-2xl text-sm font-bold tracking-wide',
              isLocked
                ? 'bg-background/20 text-background border border-background/30'
                : 'bg-background text-foreground'
            )}
          >
            {isLocked
              ? t('unlockEmoji')
              : completedCount > 0
              ? t('continueDay', { day: completedCount + 1 })
              : t('start')}
          </button>
        </div>

        <div className="px-4 pt-4 pb-2">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {LEVELS.map((level) => (
              <button
                key={level}
                onClick={() => setActiveLevel(level)}
                className={cn(
                  'flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors',
                  activeLevel === level
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-muted-foreground border-border'
                )}
              >
                {t(level)}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 py-2">
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">
            {t('trainingsCount', { count: filteredDays.length })}
          </p>
        </div>

        <div className="flex-1 px-4 pb-6 space-y-2">
          {filteredDays.map((day) => {
            const unlocked = isDayUnlocked(day)
            const completed = day.completed

            return (
              <button
                key={day.day_number}
                onClick={() => handleDayClick(day)}
                className="w-full flex items-center gap-3 bg-card border border-border rounded-2xl p-3.5 text-left transition-all active:scale-[0.98]"
              >
                <div className={cn(
                  'w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0',
                  completed ? 'bg-foreground' : 'bg-secondary',
                  (!unlocked || isLocked) && 'opacity-50'
                )}>
                  {completed
                    ? <CheckCircle2 size={22} className="text-background" />
                    : (!unlocked || isLocked)
                    ? <Lock size={18} className="text-muted-foreground" />
                    : <Play size={18} className="text-foreground" />}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-muted-foreground font-medium mb-0.5">{t(day.level)}</p>
                  <p className={cn(
                    'font-bold text-sm leading-tight truncate',
                    (!unlocked || isLocked) && 'text-muted-foreground'
                  )}>
                    {day.title}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Clock size={11} className="text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{day.duration_minutes} min</span>
                  </div>
                </div>

                <span className="text-xs text-muted-foreground font-semibold flex-shrink-0">
                  {t('dayLabel', { day: day.day_number })}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <PaywallModal
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        challengeTitle={challengeTitle}
      />

      <Dialog open={sequentialOpen} onOpenChange={setSequentialOpen}>
        <DialogContent className="sm:max-w-xs rounded-3xl text-center p-6 gap-0">
          <div className="text-4xl mb-4">🔒</div>
          <h3 className="text-lg font-bold mb-2">{t('lessonLocked')}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t('lessonLockedDesc')}
          </p>
          <button
            onClick={() => setSequentialOpen(false)}
            className="mt-5 w-full py-3 bg-foreground text-background rounded-2xl text-sm font-bold"
          >
            {t('understood')}
          </button>
        </DialogContent>
      </Dialog>
    </>
  )
}
