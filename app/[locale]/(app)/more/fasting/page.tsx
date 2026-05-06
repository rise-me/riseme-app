import { getTranslations } from 'next-intl/server'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function FastingPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations('fasting')

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

      <div className="flex flex-col items-center justify-center py-16 space-y-4 text-center">
        <div className="text-6xl">⏰</div>
        <h2 className="text-xl font-black">{t('comingSoon')}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
          {t('comingSoonDesc')}
        </p>
      </div>
    </div>
  )
}
