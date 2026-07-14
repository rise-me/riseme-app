'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { FileText, ChevronRight, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PaywallModal } from '@/components/subscription/PaywallModal'

interface BonusItem {
  id: string
  emoji: string
  pageCount: number
  title: string
  description: string
  unlocked: boolean
}

export function BonusList({
  items,
  locale,
  hasAnyAccess,
}: {
  items: BonusItem[]
  locale: string
  hasAnyAccess: boolean
}) {
  const t = useTranslations('bonus')
  const [paywallOpen, setPaywallOpen] = useState(false)

  return (
    <>
      <div className="px-4 pt-12 pb-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {hasAnyAccess ? t('subtitle') : t('lockedSubtitle')}
          </p>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground pt-8 text-center">{t('emptyState')}</p>
        ) : (
          <div className="space-y-2.5">
            {items.map((item) => {
              const card = (
                <div
                  className={cn(
                    'flex items-center gap-4 bg-card rounded-2xl p-4 border border-border transition-all active:scale-[0.98]',
                    !item.unlocked && 'opacity-75'
                  )}
                >
                  <div
                    className={cn(
                      'w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 bg-secondary',
                      !item.unlocked && 'grayscale'
                    )}
                  >
                    {item.emoji}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm leading-tight">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
                    <div className="flex items-center gap-1 mt-1 text-muted-foreground">
                      <FileText size={12} />
                      <span className="text-[11px] font-medium">
                        {t('pageCount', { count: item.pageCount })}
                      </span>
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    {item.unlocked ? (
                      <ChevronRight size={18} className="text-muted-foreground" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center lock-glow">
                        <Lock size={14} className="text-foreground" />
                      </div>
                    )}
                  </div>
                </div>
              )

              return item.unlocked ? (
                <Link key={item.id} href={`/${locale}/bonus/${item.id}`}>
                  {card}
                </Link>
              ) : (
                <button key={item.id} className="w-full text-left" onClick={() => setPaywallOpen(true)}>
                  {card}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </>
  )
}
