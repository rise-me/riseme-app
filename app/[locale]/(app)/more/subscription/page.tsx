import { getTranslations } from 'next-intl/server'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

export default async function SubscriptionPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations('subscriptionPage')
  const tSub = await getTranslations('subscription')

  const benefits = [t('benefit1'), t('benefit2'), t('benefit3'), t('benefit4')]

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
          <p className="text-lg font-black">{t('starter')}</p>
          <span className="text-xs font-bold px-2.5 py-1 bg-secondary text-muted-foreground rounded-full">
            {t('starterBadge')}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {t('starterDesc')}
        </p>
      </div>

      <div className="bg-foreground text-background rounded-2xl p-5 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-background/60 mb-1">
            {t('unlockAllHeader')}
          </p>
          <p className="text-xl font-black leading-tight">
            {t('unlimitedAccess')}
          </p>
        </div>

        <div className="space-y-2">
          {benefits.map((b) => (
            <div key={b} className="flex items-center gap-2.5">
              <CheckCircle2 size={15} className="text-background/70 flex-shrink-0" />
              <span className="text-sm text-background/80">{b}</span>
            </div>
          ))}
        </div>

        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between bg-background/10 rounded-xl px-4 py-3 border border-background/20">
            <div>
              <p className="text-sm font-bold">{tSub('annual')}</p>
              <p className="text-xs text-background/60">{t('annualRenewal')}</p>
            </div>
            <div className="text-right">
              <p className="font-black">$19</p>
              <p className="text-xs text-background/60">{tSub('perYear')}</p>
            </div>
            <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-400/20 text-green-300">
              {t('save70')}
            </span>
          </div>
          <div className="flex items-center justify-between bg-background/5 rounded-xl px-4 py-3 border border-background/10">
            <div>
              <p className="text-sm font-bold">{tSub('monthly')}</p>
              <p className="text-xs text-background/60">{t('monthlyRenewal')}</p>
            </div>
            <div className="text-right">
              <p className="font-black">$7</p>
              <p className="text-xs text-background/60">{tSub('perMonth')}</p>
            </div>
          </div>
        </div>

        <button className="w-full py-4 bg-background text-foreground rounded-2xl text-sm font-bold tracking-wide">
          {tSub('unlockAccess')}
        </button>

        <p className="text-center text-xs text-background/40">{tSub('cancelAnytime')}</p>
      </div>
    </div>
  )
}
