import { getTranslations } from 'next-intl/server'
import { ArrowLeft, Camera } from 'lucide-react'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/current-user-server'

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations('profile')
  const tAuth = await getTranslations('auth')
  const tChallenges = await getTranslations('challenges')
  const user = await getCurrentUser()

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

      <div className="flex flex-col items-center gap-2 py-2">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center text-2xl font-black">
            {user?.initial ?? '?'}
          </div>
          <button className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-foreground flex items-center justify-center border-2 border-background">
            <Camera size={13} className="text-background" />
          </button>
        </div>
        <p className="text-base font-bold">{user?.name ?? ''}</p>
        <p className="text-sm text-muted-foreground">{user?.email ?? ''}</p>
      </div>

      <section className="space-y-2">
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest px-1">
          {t('personalDetails')}
        </p>
        <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
          <ProfileField label={tAuth('name')} value={user?.name ?? ''} />
          <ProfileField label={tAuth('email')} value={user?.email ?? ''} />
          <ProfileField label={t('fitnessLevel')} value={tChallenges('beginner')} />
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest px-1">
          {t('legal')}
        </p>
        <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
          <ProfileField label={t('termsOfUse')} />
          <ProfileField label={t('privacyPolicy')} />
        </div>
      </section>
    </div>
  )
}

function ProfileField({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-4">
      <span className="text-sm font-medium">{label}</span>
      {value && <span className="text-sm text-muted-foreground">{value}</span>}
    </div>
  )
}
