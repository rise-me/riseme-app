'use client'

import Link from 'next/link'
import { Lock, ChevronRight, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MockChallenge } from '@/lib/mock-challenges'
import { useTranslations } from 'next-intl'

interface ChallengeCardProps {
  challenge: MockChallenge
  locale: string
  onLockedClick?: (challenge: MockChallenge) => void
}

export function ChallengeCard({ challenge, locale, onLockedClick }: ChallengeCardProps) {
  const t = useTranslations('challenges')
  const isLocked = challenge.status === 'locked'
  const isActive = challenge.status === 'active'
  const isCompleted = challenge.status === 'completed'

  const cardContent = (
    <div className={cn(
      'flex items-center gap-4 bg-card rounded-2xl p-4 border border-border',
      'transition-all active:scale-[0.98]',
      isLocked && 'opacity-75'
    )}>
      {/* Thumbnail */}
      <div className={cn(
        'w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0',
        'bg-secondary',
        isLocked && 'grayscale'
      )}>
        {challenge.thumbnail_emoji}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-xs text-muted-foreground font-medium">{challenge.category}</span>
          {isCompleted && <CheckCircle2 size={12} className="text-green-600" />}
        </div>
        <p className="font-bold text-sm leading-tight">{challenge.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {challenge.days_count} {t('workouts')}
        </p>

        {/* Progress bar for active */}
        {isActive && challenge.current_day && (
          <div className="mt-2 h-1 bg-secondary rounded-full">
            <div
              className="h-full bg-foreground rounded-full transition-all"
              style={{ width: `${(challenge.current_day / challenge.days_count) * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* Right icon */}
      <div className="flex-shrink-0">
        {isLocked ? (
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
            <Lock size={14} className="text-muted-foreground" />
          </div>
        ) : (
          <ChevronRight size={18} className="text-muted-foreground" />
        )}
      </div>
    </div>
  )

  if (isLocked) {
    return (
      <button
        className="w-full text-left"
        onClick={() => onLockedClick?.(challenge)}
      >
        {cardContent}
      </button>
    )
  }

  return (
    <Link href={`/${locale}/challenges/${challenge.id}`}>
      {cardContent}
    </Link>
  )
}
