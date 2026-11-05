import { getTranslations } from 'next-intl/server'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { getUserAccess } from '@/lib/user-access-server'
import { createClient } from '@/lib/supabase/server'
import { assinaturasDaAluna } from './actions'
import { CancelarAssinatura } from './CancelarAssinatura'

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
  const [subscription, hotmart] = await Promise.all([
    access.userId && access.hasActiveSubscription ? getActiveSubscription(access.userId) : Promise.resolve(null),
    // Assinaturas reais na Hotmart (pelo e-mail da conta): é daqui que sai o botão de cancelar (05/11/2026).
    access.userId ? assinaturasDaAluna().catch(() => null) : Promise.resolve(null),
  ])
  const CANCELAVEL = /^(ACTIVE|DELAYED|STARTED|OVERDUE)$/i
  const hotmartSubs = (hotmart ?? []).filter((a) => CANCELAVEL.test(a.status) || /CANCEL/i.test(a.status))
  const statusLabel = (a: { status: string; trial: boolean }) =>
    /CANCEL/i.test(a.status) ? t('statusCancelled') : a.trial ? t('statusTrial') : /^(DELAYED|OVERDUE)$/i.test(a.status) ? t('statusDelayed') : /^ACTIVE$/i.test(a.status) ? t('statusActive') : t('statusOther', { status: a.status })
  const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' }) : null)

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
        {hasSubscription && !hotmartSubs.length && (
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

      {hotmartSubs.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">{t('hotmartHeader')}</p>
          {hotmartSubs.map((a) => (
            <div key={a.codigo} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold">{a.produto}{a.plano ? ` · ${a.plano}` : ''}</p>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-secondary text-muted-foreground">{statusLabel(a)}</span>
              </div>
              {!/CANCEL/i.test(a.status) && fmt(a.proximaCobranca) && (
                <p className="text-xs text-muted-foreground">{t('nextCharge', { date: fmt(a.proximaCobranca)! })}</p>
              )}
              {!/CANCEL/i.test(a.status) && (
                <>
                  <p className="text-xs text-muted-foreground">{t('accessUntilNote')}</p>
                  <CancelarAssinatura codigo={a.codigo} locale={locale} />
                </>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  )
}
