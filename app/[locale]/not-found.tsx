import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'

export default async function LocaleNotFound() {
  const locale = await getLocale()
  const t = await getTranslations('errors')

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center space-y-6 bg-background">
      <h1 className="text-4xl font-black tracking-tighter inline-flex items-baseline">
        Rise<span className="text-lg font-bold ml-0.5" style={{ verticalAlign: '-0.1em' }}>Me</span>
      </h1>
      <div className="space-y-1">
        <p className="text-lg font-bold">{t('notFoundTitle')}</p>
        <p className="text-sm text-muted-foreground">{t('notFoundDesc')}</p>
      </div>
      <Link
        href={`/${locale}/home`}
        className="px-6 py-3 bg-foreground text-background rounded-2xl text-sm font-bold"
      >
        {t('backHome')}
      </Link>
    </div>
  )
}
