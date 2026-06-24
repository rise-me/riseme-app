'use client'

import { CheckCircle2, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'
import { track } from '@/lib/posthog/track'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'

type Plan = 'monthly' | 'annual'

interface PaywallModalProps {
  open: boolean
  onClose: () => void
  challengeTitle?: string
}

export function PaywallModal({ open, onClose, challengeTitle }: PaywallModalProps) {
  const t = useTranslations('subscription')
  const [selectedPlan, setSelectedPlan] = useState<Plan>('annual')

  useEffect(() => {
    if (open) {
      track('paywall_viewed', { source: 'modal', challenge_title: challengeTitle ?? null })
    }
  }, [open, challengeTitle])

  const plans = {
    annual: {
      key: 'annual' as Plan,
      label: t('annual'),
      price: '$19',
      period: t('perYear'),
      renewsAt: '$49',
      badge: t('save', { percent: 70 }),
      badgeColor: 'bg-green-100 text-green-700',
    },
    monthly: {
      key: 'monthly' as Plan,
      label: t('monthly'),
      price: '$7',
      period: t('perMonth'),
      renewsAt: '$14,90',
      badge: null,
      badgeColor: '',
    },
  }

  const benefits = [
    t('benefit1'),
    t('benefit2'),
    t('benefit3'),
    t('benefit4'),
  ]

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm rounded-3xl p-0 gap-0 border-0 overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-7 h-7 rounded-full bg-secondary flex items-center justify-center"
        >
          <X size={14} className="text-muted-foreground" />
        </button>

        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="pr-8">
            <h2 className="text-xl font-bold leading-tight">{t('exclusiveOffer')}</h2>
            {challengeTitle && (
              <p className="text-sm text-muted-foreground mt-1">
                {t('unlockBlock', { title: challengeTitle })}
              </p>
            )}
          </div>

          {/* Plan selector */}
          <div className="space-y-2">
            {Object.values(plans).map((plan) => (
              <button
                key={plan.key}
                onClick={() => setSelectedPlan(plan.key)}
                className={cn(
                  'w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left',
                  selectedPlan === plan.key
                    ? 'border-foreground bg-foreground/5'
                    : 'border-border bg-card'
                )}
              >
                {/* Radio */}
                <div className={cn(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                  selectedPlan === plan.key ? 'border-foreground' : 'border-border'
                )}>
                  {selectedPlan === plan.key && (
                    <div className="w-2.5 h-2.5 rounded-full bg-foreground" />
                  )}
                </div>

                {/* Plan info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">{plan.label}</span>
                    {plan.badge && (
                      <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', plan.badgeColor)}>
                        {plan.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t('renewsAt', { price: plan.renewsAt })}
                  </p>
                </div>

                {/* Price */}
                <div className="text-right">
                  <span className="font-bold text-base">{plan.price}</span>
                  <span className="text-xs text-muted-foreground">{plan.period}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Benefits */}
          <div className="space-y-2">
            {benefits.map((benefit) => (
              <div key={benefit} className="flex items-center gap-2.5">
                <CheckCircle2 size={16} className="text-green-600 flex-shrink-0" />
                <span className="text-sm text-foreground">{benefit}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={() => {
              const url = selectedPlan === 'annual'
                ? process.env.NEXT_PUBLIC_HOTMART_CHECKOUT_ANNUAL
                : process.env.NEXT_PUBLIC_HOTMART_CHECKOUT_MONTHLY
              track('subscription_clicked', { plan: selectedPlan, source: 'modal' })
              if (url) window.location.href = url
            }}
            className="w-full py-4 bg-foreground text-background rounded-2xl text-sm font-bold tracking-wide"
          >
            {t('unlockAccess')}
          </button>

          {/* Footer */}
          <div className="text-center space-y-1">
            <p className="text-xs text-muted-foreground">{t('cancelAnytime')}</p>
            <button className="text-xs text-muted-foreground underline">
              {t('restorePurchases')}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
