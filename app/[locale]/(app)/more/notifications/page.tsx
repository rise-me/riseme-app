'use client'

import { useTranslations } from 'next-intl'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'

const NOTIFICATION_KEYS = [
  { id: 'daily', defaultOn: true },
  { id: 'achievements', defaultOn: true },
  { id: 'new_challenges', defaultOn: false },
  { id: 'tips', defaultOn: false },
] as const

const TITLE_KEYS: Record<string, string> = {
  daily: 'dailyTitle',
  achievements: 'achievementsTitle',
  new_challenges: 'newChallengesTitle',
  tips: 'tipsTitle',
}
const DESC_KEYS: Record<string, string> = {
  daily: 'dailyDesc',
  achievements: 'achievementsDesc',
  new_challenges: 'newChallengesDesc',
  tips: 'tipsDesc',
}

export default function NotificationsPage() {
  const t = useTranslations('notifications')
  const params = useParams()
  const locale = params.locale as string
  const [states, setStates] = useState<Record<string, boolean>>(
    Object.fromEntries(NOTIFICATION_KEYS.map((n) => [n.id, n.defaultOn]))
  )

  function toggle(id: string) {
    setStates((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="px-4 pt-12 pb-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/${locale}/more`}
          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center flex-shrink-0"
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl font-bold">{t('title')}</h1>
      </div>

      <div className="bg-card border border-border rounded-2xl divide-y divide-border">
        {NOTIFICATION_KEYS.map((item) => (
          <div key={item.id} className="flex items-center gap-4 px-4 py-4 pr-5">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{t(TITLE_KEYS[item.id])}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t(DESC_KEYS[item.id])}</p>
            </div>
            <button
              onClick={() => toggle(item.id)}
              className={cn(
                'relative w-11 h-6 rounded-full transition-colors flex-shrink-0',
                states[item.id] ? 'bg-foreground' : 'bg-border'
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 w-5 h-5 rounded-full bg-background shadow transition-transform',
                  states[item.id] ? 'translate-x-5' : 'translate-x-0.5'
                )}
              />
            </button>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center px-4">
        {t('autoSaved')}
      </p>
    </div>
  )
}
