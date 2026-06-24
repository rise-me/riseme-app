import { getTranslations } from 'next-intl/server'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { getUserAccess } from '@/lib/user-access-server'
import { createClient } from '@/lib/supabase/server'

type Subscription = {
  plan_type: string | null
  current_period_end: string | null
}

async function getActiveSubscription(userId: string): Promise<Subscription | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('subscriptions')
    .select('plan_type, current_period_end')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('current_period_end', { ascending: false })
    .limit(1)
  return data?.[0] ?? null
}

export default async function SubscriptionPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations('subscriptionPage')

  const access = await getUserAccess()
  const subscription =
    access.userId && access.hasActiveSubscription
      ? await getActiveSubscription(access.userId)
      : null

  const hasSubscription = !!subscription
  const hasLifetime = !hasSubscription && access.ownedChallengeIds.size > 0

  let planLabel: string
  let planDesc: string
  if (hasSubscription) {
    planLabel = subscription?.plan_type === 'annual' ? t('planAnnual') : t('planMonthly')
    planDesc = t('subscriberDesc')
  } else if (hasLifetime) {
    planLabel = t('planLifetime')
    planDesc = t('lifetimeDesc')
  } else {
    planLabel = t('starter')
    planDesc = t('starterDesc')
  }

  const renewsOn =
    hasSubscription && subscription?.current_period_end
      ? new Date(subscription.current_period_end).toLocaleDateString(locale, {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        })
      : null

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

      <div className="bg-card border border-border rounded-2xl p-5 space-y-1">
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">
          {t('currentPlan')}
        </p>
        <div className="flex items-center justify-between">
          <p className="text-lg font-black">{planLabel}</p>
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              hasSubscription || hasLifetime
                ? 'bg-foreground text-background'
                : 'bg-secondary text-muted-foreground'
            }`}
          >
            {hasSubscription || hasLifetime ? t('activeBadge') : t('starterBadge')}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{planDesc}</p>
        {renewsOn && (
          <p className="text-xs text-muted-foreground pt-1">
            {t('renewsOn', { date: renewsOn })}
          </p>
        )}
        {hasSubscription && (
          <a
            href="https://app-vlc.hotmart.com/tools/subscriptions"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground underline pt-2"
          >
            {t('manageInHotmart')}
            <ExternalLink size={12} />
          </a>
        )}
      </div>

    </div>
  )
}
