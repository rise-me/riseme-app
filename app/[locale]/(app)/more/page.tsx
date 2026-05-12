import { getTranslations } from 'next-intl/server'
import { Timer, User, HelpCircle, Bell, CreditCard, Globe, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { LogoutButton } from '@/components/layout/LogoutButton'
import { getCurrentUser } from '@/lib/current-user-server'

export default async function MorePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations('more')
  const user = await getCurrentUser()

  return (
    <div className="px-4 pt-12 pb-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
        <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-sm font-bold">
          {user?.initial ?? '?'}
        </div>
      </div>

      {/* Seu progresso */}
      <section className="space-y-2">
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest px-1">
          {t('yourProgress')}
        </p>
        <MoreGroup>
          <MoreLink href={`/${locale}/more/fasting`} icon={<Timer size={18} />} label={t('fasting')} />
        </MoreGroup>
      </section>

      {/* Conta */}
      <section className="space-y-2">
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest px-1">
          {t('account')}
        </p>
        <MoreGroup>
          <MoreLink href={`/${locale}/more/profile`} icon={<User size={18} />} label={t('myProfile')} />
          <MoreLink href={`/${locale}/more/notifications`} icon={<Bell size={18} />} label={t('notificationsLabel')} />
          <MoreLink href={`/${locale}/more/subscription`} icon={<CreditCard size={18} />} label={t('manageSubscription')} />
          <MoreLink href={`/${locale}/more/language`} icon={<Globe size={18} />} label={t('language')} />
          <LogoutButton locale={locale} />
        </MoreGroup>
      </section>

      {/* Suporte */}
      <section className="space-y-2">
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest px-1">
          {t('support')}
        </p>
        <MoreGroup>
          <MoreLink href={`/${locale}/more/help`} icon={<HelpCircle size={18} />} label={t('helpCenter')} />
        </MoreGroup>
      </section>

      <p className="text-center text-xs text-muted-foreground pt-2">{t('version')}</p>
    </div>
  )
}

function MoreGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-2xl overflow-hidden border border-border divide-y divide-border">
      {children}
    </div>
  )
}

function MoreLink({
  href,
  icon,
  label,
  badge,
}: {
  href: string
  icon: React.ReactNode
  label: string
  badge?: string
}) {
  return (
    <Link href={href} className="w-full flex items-center gap-3 px-4 py-4 active:bg-secondary/50 transition-colors">
      <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-foreground flex-shrink-0">
        {icon}
      </div>
      <span className="flex-1 text-sm font-medium">{label}</span>
      {badge && (
        <span className="text-[10px] font-bold px-2 py-0.5 bg-foreground text-background rounded-full mr-1">
          {badge}
        </span>
      )}
      <ChevronRight size={16} className="text-muted-foreground flex-shrink-0" />
    </Link>
  )
}
